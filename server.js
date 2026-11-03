const express = require("express");
const session = require("express-session");
const bcrypt = require("bcryptjs");
const { Pool } = require("pg");
const fs = require("node:fs/promises");
const path = require("node:path");

const app = express();
const PORT = Number(process.env.PORT) || 3000;
const pool = new Pool(
    process.env.DATABASE_URL
        ? { connectionString: process.env.DATABASE_URL }
        : {
            host: process.env.PGHOST || "localhost",
            port: Number(process.env.PGPORT) || 5432,
            database: process.env.PGDATABASE || "blogdb",
            user: process.env.PGUSER || "postgres",
            password: process.env.PGPASSWORD
        }
);

if (process.env.NODE_ENV === "production" && !process.env.SESSION_SECRET) {
    throw new Error("SESSION_SECRET must be set in production.");
}

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));
app.use(express.urlencoded({ extended: false }));
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));
app.use(session({
    secret: process.env.SESSION_SECRET || "local-development-session-secret",
    resave: false,
    saveUninitialized: false,
    cookie: {
        httpOnly: true,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
        maxAge: 24 * 60 * 60 * 1000
    }
}));

app.use((req, res, next) => {
    res.locals.currentUser = req.session.user || null;
    next();
});

function requireSignIn(req, res, next) {
    if (!req.session.user) {
        return res.redirect("/signin?message=Please%20sign%20in%20to%20continue.");
    }
    next();
}

function requireApiSignIn(req, res, next) {
    if (!req.session.user) {
        return res.status(401).json({ error: "Please sign in to continue." });
    }
    next();
}

function validPostFields({ title, body, category, postColor }) {
    return Boolean(
        typeof title === "string" && title.trim() &&
        typeof body === "string" && body.trim() &&
        ["Tech", "Music", "Education", "Other"].includes(category) &&
        ["DarkGreen", "Moss", "RosyBrown", "Midnight"].includes(postColor) &&
        title.trim().length <= 255
    );
}

function validPostId(id) {
    const numericId = Number(id);
    return /^\d+$/.test(id) && Number.isSafeInteger(numericId) && numericId > 0 && numericId <= 2147483647;
}

function postFields(req) {
    const body = req.body && typeof req.body === "object" && !Array.isArray(req.body)
        ? req.body
        : {};
    const { title, body: content, category, postColor } = body;
    return { title, body: content, category, postColor };
}

function renderSignUp(res, {
    error = "",
    userId = "",
    name = "",
    age = "",
    occupation = "",
    city = ""
} = {}) {
    res.status(error ? 400 : 200).render("signup", { error, userId, name, age, occupation, city });
}

function renderSignIn(res, { error = "", userId = "" } = {}) {
    res.status(error ? 400 : 200).render("signin", { error, userId });
}

function authFields(req) {
    const body = req.body && typeof req.body === "object" && !Array.isArray(req.body)
        ? req.body
        : {};
    return {
        userId: typeof body.user_id === "string" ? body.user_id.trim() : "",
        name: typeof body.name === "string" ? body.name.trim() : "",
        password: typeof body.password === "string" ? body.password : "",
        age: body.age === undefined || body.age === null || body.age === "" ? null : Number(body.age),
        occupation: typeof body.occupation === "string" ? body.occupation.trim() : "",
        city: typeof body.city === "string" ? body.city.trim() : ""
    };
}

function validProfileFields({ age, occupation, city }) {
    return (
        (age === null || (Number.isInteger(age) && age >= 13 && age <= 120)) &&
        occupation.length <= 255 &&
        city.length <= 255
    );
}

async function registerUser(userId, name, password, { age, occupation, city }) {
    const passwordHash = await bcrypt.hash(password, 12);
    try {
        await pool.query(
            `INSERT INTO users (user_id, password, name, age, occupation, city)
             VALUES ($1, $2, $3, $4, $5, $6)`,
            [userId, passwordHash, name, age, occupation || null, city || null]
        );
        return true;
    } catch (error) {
        if (error.code === "23505") return false;
        throw error;
    }
}

async function authenticateUser(userId, password) {
    const { rows } = await pool.query(
        "SELECT user_id, password, name FROM users WHERE user_id = $1",
        [userId]
    );
    const user = rows[0];
    if (!user || !(await bcrypt.compare(password, user.password))) return null;
    return { userId: user.user_id, name: user.name };
}

function establishSession(req, user) {
    return new Promise((resolve, reject) => {
        req.session.regenerate((error) => {
            if (error) return reject(error);
            req.session.user = user;
            req.session.save((saveError) => {
                if (saveError) return reject(saveError);
                resolve();
            });
        });
    });
}

app.get("/", (req, res) => {
    res.render("index");
});

app.get("/api/blogs", async (req, res, next) => {
    try {
        const { rows } = await pool.query(
            `SELECT blog_id, creator_name, creator_user_id, title, body,
                    category, post_color, date_created
             FROM blogs
             ORDER BY date_created DESC, blog_id DESC`
        );
        res.json({
            blogs: rows.map((blog) => ({
                ...blog,
                canEdit: Boolean(
                    req.session.user &&
                    req.session.user.userId === blog.creator_user_id
                )
            }))
        });
    } catch (error) {
        next(error);
    }
});

app.get("/api/profile", requireApiSignIn, async (req, res, next) => {
    try {
        const [userResult, blogResult] = await Promise.all([
            pool.query(
                "SELECT user_id, name, age, occupation, city FROM users WHERE user_id = $1",
                [req.session.user.userId]
            ),
            pool.query(
                `SELECT blog_id, creator_name, creator_user_id, title, body,
                        category, post_color, date_created
                 FROM blogs
                 WHERE creator_user_id = $1
                 ORDER BY date_created DESC, blog_id DESC`,
                [req.session.user.userId]
            )
        ]);
        if (!userResult.rows[0]) {
            return res.status(404).json({ error: "Profile not found." });
        }
        res.json({ user: userResult.rows[0], blogs: blogResult.rows });
    } catch (error) {
        next(error);
    }
});

app.patch("/api/profile", requireApiSignIn, async (req, res, next) => {
    const body = req.body && typeof req.body === "object" && !Array.isArray(req.body)
        ? req.body
        : {};
    const name = typeof body.name === "string" ? body.name.trim() : "";
    const age = body.age === undefined || body.age === null || body.age === ""
        ? null
        : Number(body.age);
    const occupation = typeof body.occupation === "string" ? body.occupation.trim() : "";
    const city = typeof body.city === "string" ? body.city.trim() : "";

    if (!name || name.length > 255) {
        return res.status(400).json({ error: "Name is required and must be 255 characters or fewer." });
    }
    if (!validProfileFields({ age, occupation, city })) {
        return res.status(400).json({
            error: "Age must be between 13 and 120; occupation and city must be 255 characters or fewer."
        });
    }

    let client;
    try {
        client = await pool.connect();
        await client.query("BEGIN");
        const { rows } = await client.query(
            `UPDATE users
             SET name = $1, age = $2, occupation = $3, city = $4
             WHERE user_id = $5
             RETURNING user_id, name, age, occupation, city`,
            [name, age, occupation || null, city || null, req.session.user.userId]
        );
        if (!rows[0]) {
            await client.query("ROLLBACK");
            return res.status(404).json({ error: "Profile not found." });
        }
        await client.query(
            "UPDATE blogs SET creator_name = $1 WHERE creator_user_id = $2",
            [name, req.session.user.userId]
        );
        await client.query("COMMIT");
        req.session.user.name = name;
        res.json({ user: rows[0] });
    } catch (error) {
        if (client) {
            try {
                await client.query("ROLLBACK");
            } catch (rollbackError) {
                console.error("Could not roll back profile update transaction.", rollbackError);
            }
        }
        next(error);
    } finally {
        if (client) client.release();
    }
});

app.post("/api/blogs", requireApiSignIn, async (req, res, next) => {
    const fields = postFields(req);
    if (!validPostFields(fields)) {
        return res.status(400).json({ error: "Please provide a valid title, body, category, and post color." });
    }

    try {
        const { rows } = await pool.query(
            `INSERT INTO blogs
                (creator_name, creator_user_id, title, body, category, post_color)
             VALUES ($1, $2, $3, $4, $5, $6)
             RETURNING blog_id, creator_name, creator_user_id, title, body,
                       category, post_color, date_created`,
            [
                req.session.user.name,
                req.session.user.userId,
                fields.title.trim(),
                fields.body.trim(),
                fields.category,
                fields.postColor
            ]
        );
        res.status(201).json({ blog: rows[0] });
    } catch (error) {
        next(error);
    }
});

app.patch("/api/blogs/:id", requireApiSignIn, async (req, res, next) => {
    if (!validPostId(req.params.id)) {
        return res.status(400).json({ error: "Post ID must be a positive integer." });
    }

    const fields = postFields(req);
    if (!validPostFields(fields)) {
        return res.status(400).json({ error: "Please provide a valid title, body, category, and post color." });
    }

    try {
        const { rows } = await pool.query(
            `UPDATE blogs
             SET title = $1, body = $2, category = $3, post_color = $4
             WHERE blog_id = $5 AND creator_user_id = $6
             RETURNING blog_id, creator_name, creator_user_id, title, body,
                       category, post_color, date_created`,
            [
                fields.title.trim(),
                fields.body.trim(),
                fields.category,
                fields.postColor,
                req.params.id,
                req.session.user.userId
            ]
        );
        if (!rows[0]) {
            return res.status(404).json({ error: "Post not found or you do not have permission to edit it." });
        }
        res.json({
            blog: {
                ...rows[0],
                canEdit: true
            }
        });
    } catch (error) {
        next(error);
    }
});

app.delete("/api/blogs/:id", requireApiSignIn, async (req, res, next) => {
    if (!validPostId(req.params.id)) {
        return res.status(400).json({ error: "Post ID must be a positive integer." });
    }

    try {
        const { rowCount } = await pool.query(
            "DELETE FROM blogs WHERE blog_id = $1 AND creator_user_id = $2",
            [req.params.id, req.session.user.userId]
        );
        if (!rowCount) {
            return res.status(404).json({ error: "Post not found or you do not have permission to delete it." });
        }
        res.json({ message: "Post deleted successfully." });
    } catch (error) {
        next(error);
    }
});

app.get("/signup", (req, res) => renderSignUp(res));
app.get("/signin", (req, res) => {
    renderSignIn(res, { error: req.query.message || "" });
});
app.get("/profile", requireSignIn, (req, res) => {
    res.render("profile");
});

app.post("/api/signup", async (req, res, next) => {
    const { userId, name, password, age, occupation, city } = authFields(req);
    if (!userId || !name || !password || userId.length > 255 || name.length > 255 || password.length > 255) {
        return res.status(400).json({
            error: "Enter a user ID, name, and password (each no longer than 255 characters)."
        });
    }
    if (!validProfileFields({ age, occupation, city })) {
        return res.status(400).json({ error: "Age must be between 13 and 120; occupation and city must be 255 characters or fewer." });
    }

    try {
        const created = await registerUser(userId, name, password, { age, occupation, city });
        if (!created) {
            return res.status(409).json({ error: "That user ID is already taken. Please choose another." });
        }
        res.status(201).json({ message: "Account created. Please sign in." });
    } catch (error) {
        next(error);
    }
});

app.post("/api/signin", async (req, res, next) => {
    const { userId, password } = authFields(req);
    if (!userId || !password || userId.length > 255 || password.length > 255) {
        return res.status(400).json({ error: "Enter a valid user ID and password." });
    }

    try {
        const user = await authenticateUser(userId, password);
        if (!user) {
            return res.status(401).json({ error: "Incorrect user ID or password. Please try again." });
        }
        await establishSession(req, user);
        res.json({ message: "Signed in successfully.", user });
    } catch (error) {
        next(error);
    }
});

app.post("/signup", async (req, res, next) => {
    const { userId, name, password, age, occupation, city } = authFields(req);

    if (!userId || !name || !password || userId.length > 255 || name.length > 255 || password.length > 255) {
        return renderSignUp(res, { error: "Enter a user ID, name, and password (each no longer than 255 characters).", userId, name, age: req.body.age || "", occupation, city });
    }
    if (!validProfileFields({ age, occupation, city })) {
        return renderSignUp(res, {
            error: "Age must be between 13 and 120; occupation and city must be 255 characters or fewer.",
            userId,
            name,
            age: req.body.age || "",
            occupation,
            city
        });
    }

    try {
        const created = await registerUser(userId, name, password, { age, occupation, city });
        if (!created) {
            return renderSignUp(res, { error: "That user ID is already taken. Please choose another.", userId, name });
        }
        res.redirect("/signin?message=Account%20created.%20Please%20sign%20in.");
    } catch (error) {
        next(error);
    }
});

app.post("/signin", async (req, res, next) => {
    const { userId, password } = authFields(req);
    if (!userId || !password || userId.length > 255 || password.length > 255) {
        return renderSignIn(res, { error: "Enter a valid user ID and password.", userId });
    }

    try {
        const user = await authenticateUser(userId, password);
        if (!user) {
            return renderSignIn(res, { error: "Incorrect user ID or password. Please try again.", userId });
        }
        await establishSession(req, user);
        res.redirect("/");
    } catch (error) {
        next(error);
    }
});

app.post("/signout", (req, res, next) => {
    req.session.destroy((error) => {
        if (error) return next(error);
        res.clearCookie("connect.sid");
        res.redirect("/");
    });
});

app.post("/posts", requireSignIn, async (req, res, next) => {
    const { title, body, category, postColor } = req.body;
    if (!validPostFields({ title, body, category, postColor })) {
        return res.status(400).send("Please provide a title, body, category, and valid post color.");
    }

    try {
        await pool.query(
            `INSERT INTO blogs
                (creator_name, creator_user_id, title, body, category, post_color)
             VALUES ($1, $2, $3, $4, $5, $6)`,
            [req.session.user.name, req.session.user.userId, title.trim(), body.trim(), category, postColor]
        );
        res.redirect("/");
    } catch (error) {
        next(error);
    }
});

app.get("/posts/:id/edit", requireSignIn, async (req, res, next) => {
    try {
        const { rows } = await pool.query(
            "SELECT * FROM blogs WHERE blog_id = $1 AND creator_user_id = $2",
            [req.params.id, req.session.user.userId]
        );
        if (!rows[0]) return res.status(404).send("Post not found or you do not have permission to edit it.");
        res.render("edit", { post: rows[0], error: "" });
    } catch (error) {
        next(error);
    }
});

app.post("/posts/:id/edit", requireSignIn, async (req, res, next) => {
    const { title, body, category, postColor } = req.body;
    if (!validPostFields({ title, body, category, postColor })) {
        return res.status(400).send("Please provide a title, body, category, and valid post color.");
    }

    try {
        const { rowCount } = await pool.query(
            `UPDATE blogs
             SET title = $1, body = $2, category = $3, post_color = $4
             WHERE blog_id = $5 AND creator_user_id = $6`,
            [title.trim(), body.trim(), category, postColor, req.params.id, req.session.user.userId]
        );
        if (!rowCount) return res.status(404).send("Post not found or you do not have permission to edit it.");
        res.redirect("/");
    } catch (error) {
        next(error);
    }
});

app.post("/posts/:id/delete", requireSignIn, async (req, res, next) => {
    try {
        const { rowCount } = await pool.query(
            "DELETE FROM blogs WHERE blog_id = $1 AND creator_user_id = $2",
            [req.params.id, req.session.user.userId]
        );
        if (!rowCount) return res.status(404).send("Post not found or you do not have permission to delete it.");
        res.redirect("/");
    } catch (error) {
        next(error);
    }
});

app.use((error, req, res, next) => {
    console.error(error);
    if (res.headersSent) return next(error);
    if (req.path.startsWith("/api/")) {
        const status = Number.isInteger(error.status) && error.status >= 400 && error.status < 500
            ? error.status
            : 500;
        const message = status < 500
            ? error.message
            : "An unexpected server error occurred. Please try again later.";
        return res.status(status).json({ error: message });
    }
    res.status(500).send("An unexpected server error occurred. Please try again later.");
});

async function start() {
    const schema = await fs.readFile(path.join(__dirname, "db", "schema.sql"), "utf8");
    await pool.query(schema);
    app.listen(PORT, () => {
        console.log(`Blog running at http://localhost:${PORT}`);
    });
}

start().catch((error) => {
    console.error("Could not start the Blog application. Check the PostgreSQL connection and database setup.", error);
    process.exitCode = 1;
});

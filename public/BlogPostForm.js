import React, { useState } from "react";
import { createRoot } from "react-dom/client";

function BlogPostForm() {
    const [title, setTitle] = useState("");
    const [body, setBody] = useState("");
    const [category, setCategory] = useState("Tech");
    const [postColor, setPostColor] = useState("DarkGreen");
    const [error, setError] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);

    async function handleSubmit(event) {
        event.preventDefault();
        setError("");
        setIsSubmitting(true);

        try {
            const response = await fetch("/api/blogs", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ title, body, category, postColor })
            });
            const result = await response.json();
            if (!response.ok) {
                throw new Error(result.error || "Could not publish the post.");
            }
            window.location.reload();
        } catch (requestError) {
            setError(requestError.message);
            setIsSubmitting(false);
        }
    }

    return (
        <form id="creationform" onSubmit={handleSubmit}>
            {error && <p className="form-message" role="alert" aria-live="polite">{error}</p>}
            <label htmlFor="title">Title</label>
            <input
                type="text"
                id="title"
                name="title"
                maxLength="255"
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                required
            />

            <label htmlFor="contents">Blog contents</label>
            <textarea
                id="contents"
                name="body"
                value={body}
                onChange={(event) => setBody(event.target.value)}
                required
            />

            <div className="form-row">
                <div>
                    <label htmlFor="category">Category</label>
                    <select
                        id="category"
                        name="category"
                        value={category}
                        onChange={(event) => setCategory(event.target.value)}
                        required
                    >
                        <option value="Tech">Tech</option>
                        <option value="Music">Music</option>
                        <option value="Education">Education</option>
                        <option value="Other">Other</option>
                    </select>
                </div>
                <div>
                    <label htmlFor="postColor">Post color</label>
                    <select
                        id="postColor"
                        name="postColor"
                        value={postColor}
                        onChange={(event) => setPostColor(event.target.value)}
                        required
                    >
                        <option value="DarkGreen">Dark green</option>
                        <option value="Moss">Moss green</option>
                        <option value="RosyBrown">Rosy brown</option>
                        <option value="Midnight">Midnight green</option>
                    </select>
                </div>
            </div>
            <button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Publishing..." : "Publish post"}
            </button>
        </form>
    );
}

const formElement = document.getElementById("blog-post-form");
createRoot(formElement).render(<BlogPostForm />);

import React, { useState } from "react";
import { createRoot } from "react-dom/client";

function PostEditForm({ postId, initialTitle, initialBody, initialCategory, initialPostColor }) {
    const [title, setTitle] = useState(initialTitle);
    const [body, setBody] = useState(initialBody);
    const [category, setCategory] = useState(initialCategory);
    const [postColor, setPostColor] = useState(initialPostColor);
    const [error, setError] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);

    async function handleSubmit(event) {
        event.preventDefault();
        setError("");
        setIsSubmitting(true);

        try {
            const response = await fetch(`/api/blogs/${postId}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ title, body, category, postColor })
            });
            const result = await response.json();
            if (!response.ok) {
                throw new Error(result.error || "Could not save your changes.");
            }
            window.location.assign("/");
        } catch (requestError) {
            setError(requestError.message);
            setIsSubmitting(false);
        }
    }

    return (
        <>
            <a className="brand-link" href="/">The Blog Squad</a>
            <p className="eyebrow">Your writing</p>
            <h1>Edit post</h1>
            {error && <p className="form-message" role="alert" aria-live="polite">{error}</p>}
            <form onSubmit={handleSubmit}>
                <label htmlFor="title">Title</label>
                <input
                    id="title"
                    name="title"
                    type="text"
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
                <div className="post-actions">
                    <button type="submit" disabled={isSubmitting}>
                        {isSubmitting ? "Saving..." : "Save changes"}
                    </button>
                    <a className="button secondary" href="/">Cancel</a>
                </div>
            </form>
        </>
    );
}

const editRoot = document.getElementById("post-edit-form");
const initialPost = JSON.parse(document.getElementById("post-data").textContent);
createRoot(editRoot).render(
    <PostEditForm
        postId={initialPost.postId}
        initialTitle={initialPost.title}
        initialBody={initialPost.body}
        initialCategory={initialPost.category}
        initialPostColor={initialPost.postColor}
    />
);

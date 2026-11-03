import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { createRoot } from "react-dom/client";

function PostList() {
    const [posts, setPosts] = useState([]);
    const [category, setCategory] = useState("All");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const controller = new AbortController();

        async function loadPosts() {
            try {
                const response = await fetch("/api/blogs", { signal: controller.signal });
                const result = await response.json();
                if (!response.ok) {
                    throw new Error(result.error || "Could not load posts.");
                }
                setPosts(result.blogs);
            } catch (requestError) {
                if (requestError.name !== "AbortError") {
                    setError(requestError.message);
                }
            } finally {
                if (!controller.signal.aborted) setLoading(false);
            }
        }

        loadPosts();
        return () => controller.abort();
    }, []);

    useEffect(() => {
        const categoryNav = document.getElementById("category-nav");
        if (!categoryNav) return undefined;

        function handleCategoryClick(event) {
            const button = event.target.closest("button[data-category]");
            if (!button || !categoryNav.contains(button)) return;
            setCategory(button.dataset.category);
            categoryNav.querySelectorAll("button").forEach((item) => {
                item.classList.toggle("active", item === button);
            });
        }

        categoryNav.addEventListener("click", handleCategoryClick);
        return () => categoryNav.removeEventListener("click", handleCategoryClick);
    }, []);

    async function deletePost(post) {
        if (!window.confirm(`Delete "${post.title}"? This cannot be undone.`)) return;

        setError("");
        try {
            const response = await fetch(`/api/blogs/${post.blog_id}`, { method: "DELETE" });
            const result = await response.json();
            if (!response.ok) {
                throw new Error(result.error || "Could not delete the post.");
            }
            setPosts((currentPosts) =>
                currentPosts.filter((item) => item.blog_id !== post.blog_id)
            );
        } catch (requestError) {
            setError(requestError.message);
        }
    }

    const visiblePosts = posts.filter(
        (post) => category === "All" || post.category === category
    );

    return (
        <>
            {createPortal(
                loading ? "Loading posts..." : `${posts.length} posts`,
                document.getElementById("post-count")
            )}
            {error && <p className="form-message" role="alert">{error}</p>}
            {!loading && !error && posts.length === 0 && (
                <p className="empty-state">No posts yet. Be the first to share something!</p>
            )}
            {!loading && !error && posts.length > 0 && visiblePosts.length === 0 && (
                <p className="empty-state">No posts in this category yet.</p>
            )}
            {visiblePosts.map((post) => (
                <article
                    className={`post ${post.post_color}`}
                    data-category={post.category}
                    key={post.blog_id}
                >
                    <div className="post-topline">
                        <span className="category-tag">{post.category}</span>
                        <time dateTime={post.date_created}>
                            {new Date(post.date_created).toLocaleString()}
                        </time>
                    </div>
                    <h3>{post.title}</h3>
                    <p className="post-author">By {post.creator_name}</p>
                    <p className="post-content">{post.body}</p>
                    {post.canEdit && (
                        <div className="post-actions">
                            <a className="button secondary" href={`/posts/${post.blog_id}/edit`}>
                                Edit
                            </a>
                            <button
                                className="button danger"
                                type="button"
                                onClick={() => deletePost(post)}
                            >
                                Delete
                            </button>
                        </div>
                    )}
                </article>
            ))}
        </>
    );
}

const postListRoot = createRoot(document.getElementById("post-list"));
postListRoot.render(<PostList />);

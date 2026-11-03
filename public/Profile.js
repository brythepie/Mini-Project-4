import React, { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";

function Profile() {
    const [profile, setProfile] = useState(null);
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(true);
    const [isEditing, setIsEditing] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [name, setName] = useState("");
    const [age, setAge] = useState("");
    const [occupation, setOccupation] = useState("");
    const [city, setCity] = useState("");

    useEffect(() => {
        const controller = new AbortController();

        async function loadProfile() {
            try {
                const response = await fetch("/api/profile", { signal: controller.signal });
                const result = await response.json();
                if (!response.ok) {
                    throw new Error(result.error || "Could not load your profile.");
                }
                setProfile(result);
                setName(result.user.name);
                setAge(result.user.age ?? "");
                setOccupation(result.user.occupation || "");
                setCity(result.user.city || "");
            } catch (requestError) {
                if (requestError.name !== "AbortError") setError(requestError.message);
            } finally {
                if (!controller.signal.aborted) setLoading(false);
            }
        }

        loadProfile();
        return () => controller.abort();
    }, []);

    async function saveProfile(event) {
        event.preventDefault();
        setError("");
        setIsSaving(true);
        try {
            const response = await fetch("/api/profile", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name, age, occupation, city })
            });
            const result = await response.json();
            if (!response.ok) {
                throw new Error(result.error || "Could not save your profile.");
            }
            setProfile((currentProfile) => ({
                ...currentProfile,
                user: result.user,
                blogs: currentProfile.blogs.map((post) => ({
                    ...post,
                    creator_name: result.user.name
                }))
            }));
            setIsEditing(false);
        } catch (requestError) {
            setError(requestError.message);
        } finally {
            setIsSaving(false);
        }
    }

    function cancelEditing() {
        setName(profile.user.name);
        setAge(profile.user.age ?? "");
        setOccupation(profile.user.occupation || "");
        setCity(profile.user.city || "");
        setError("");
        setIsEditing(false);
    }

    if (loading) return <p className="empty-state">Loading your profile...</p>;
    if (error && !profile) return <p className="form-message" role="alert">{error}</p>;

    const { user, blogs } = profile;
    const details = [
        ["Username", user.user_id],
        ["Name", user.name],
        ["Age", user.age],
        ["Occupation", user.occupation],
        ["Current city", user.city]
    ];

    return (
        <>
            <section className="profile-card" aria-labelledby="profile-heading">
                <p className="eyebrow">Your account</p>
                <h2 id="profile-heading">My Profile</h2>
                {error && !isEditing && <p className="form-message" role="alert">{error}</p>}
                {isEditing ? (
                    <form className="profile-edit-form" onSubmit={saveProfile}>
                        {error && <p className="form-message" role="alert" aria-live="polite">{error}</p>}
                        <p className="profile-username"><strong>Username:</strong> {user.user_id}</p>
                        <label htmlFor="profile-name">Name</label>
                        <input id="profile-name" type="text" maxLength="255" value={name} onChange={(event) => setName(event.target.value)} required />
                        <label htmlFor="profile-age">Age <span>(optional)</span></label>
                        <input id="profile-age" type="number" min="13" max="120" value={age} onChange={(event) => setAge(event.target.value)} />
                        <label htmlFor="profile-occupation">Occupation <span>(optional)</span></label>
                        <input id="profile-occupation" type="text" maxLength="255" value={occupation} onChange={(event) => setOccupation(event.target.value)} />
                        <label htmlFor="profile-city">Current city <span>(optional)</span></label>
                        <input id="profile-city" type="text" maxLength="255" value={city} onChange={(event) => setCity(event.target.value)} />
                        <div className="post-actions">
                            <button type="submit" disabled={isSaving}>{isSaving ? "Saving..." : "Save profile"}</button>
                            <button className="button secondary" type="button" onClick={cancelEditing}>Cancel</button>
                        </div>
                    </form>
                ) : (
                    <>
                        <dl className="profile-details">
                            {details.map(([label, value]) => (
                                <div className="profile-detail" key={label}>
                                    <dt>{label}</dt>
                                    <dd>{value || "Not provided"}</dd>
                                </div>
                            ))}
                        </dl>
                        <button className="profile-edit-button" type="button" onClick={() => setIsEditing(true)}>
                            Edit profile
                        </button>
                    </>
                )}
            </section>

            <section className="profile-posts" aria-labelledby="profile-posts-heading">
                <div className="section-heading">
                    <div>
                        <p className="eyebrow">Your writing</p>
                        <h2 id="profile-posts-heading">My posts</h2>
                    </div>
                    <span className="post-count">{blogs.length} posts</span>
                </div>
                {blogs.length === 0 ? (
                    <p className="empty-state">You haven&apos;t published any posts yet.</p>
                ) : (
                    blogs.map((post) => (
                        <article className={`post ${post.post_color}`} key={post.blog_id}>
                            <div className="post-topline">
                                <span className="category-tag">{post.category}</span>
                                <time dateTime={post.date_created}>
                                    {new Date(post.date_created).toLocaleString()}
                                </time>
                            </div>
                            <h3>{post.title}</h3>
                            <p className="post-content">{post.body}</p>
                            <div className="post-actions">
                                <a className="button secondary" href={`/posts/${post.blog_id}/edit`}>
                                    Edit
                                </a>
                            </div>
                        </article>
                    ))
                )}
            </section>
        </>
    );
}

createRoot(document.getElementById("profile-root")).render(<Profile />);

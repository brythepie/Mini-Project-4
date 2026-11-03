import React, { useState } from "react";
import { createRoot } from "react-dom/client";

async function submitCredentials(endpoint, fields) {
    const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(fields)
    });
    const result = await response.json();
    if (!response.ok) {
        throw new Error(result.error || "The request could not be completed.");
    }
    return result;
}

function FormMessage({ children }) {
    return children ? <p className="form-message" role="alert" aria-live="polite">{children}</p> : null;
}

function SignIn({ initialError, initialUserId }) {
    const [userId, setUserId] = useState(initialUserId);
    const [password, setPassword] = useState("");
    const [error, setError] = useState(initialError);
    const [isSubmitting, setIsSubmitting] = useState(false);

    async function handleSubmit(event) {
        event.preventDefault();
        setError("");
        setIsSubmitting(true);
        try {
            await submitCredentials("/api/signin", { user_id: userId, password });
            window.location.assign("/");
        } catch (requestError) {
            setError(requestError.message);
            setIsSubmitting(false);
        }
    }

    return (
        <>
            <a className="brand-link" href="/">The Blog Squad</a>
            <p className="eyebrow">Welcome back</p>
            <h1>Sign in</h1>
            <p>Pick up where you left off.</p>
            <FormMessage>{error}</FormMessage>
            <form onSubmit={handleSubmit}>
                <label htmlFor="user_id">User ID</label>
                <input id="user_id" name="user_id" type="text" maxLength="255" value={userId} onChange={(event) => setUserId(event.target.value)} autoComplete="username" required />
                <label htmlFor="password">Password</label>
                <input id="password" name="password" type="password" maxLength="255" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="current-password" required />
                <button type="submit" disabled={isSubmitting}>{isSubmitting ? "Signing in..." : "Sign in"}</button>
            </form>
            <p className="auth-switch">New here? <a href="/signup">Create an account</a></p>
            <details className="demo-logins">
                <summary>Demo accounts</summary>
                <p>john / Maneater11!</p>
                <p>glenn / RhinestoneCowboy13!</p>
                <p>ark / SheStoleMyHeart17!</p>
                <p>stephen / UntilIFoundYou23!</p>
                <p>edward / Home29!</p>
            </details>
        </>
    );
}

function SignUp({ initialError, initialUserId, initialName, initialAge, initialOccupation, initialCity }) {
    const [userId, setUserId] = useState(initialUserId);
    const [name, setName] = useState(initialName);
    const [age, setAge] = useState(initialAge);
    const [occupation, setOccupation] = useState(initialOccupation);
    const [city, setCity] = useState(initialCity);
    const [password, setPassword] = useState("");
    const [error, setError] = useState(initialError);
    const [isSubmitting, setIsSubmitting] = useState(false);

    async function handleSubmit(event) {
        event.preventDefault();
        setError("");
        setIsSubmitting(true);
        try {
            await submitCredentials("/api/signup", {
                user_id: userId,
                name,
                password,
                age,
                occupation,
                city
            });
            window.location.assign("/signin?message=Account%20created.%20Please%20sign%20in.");
        } catch (requestError) {
            setError(requestError.message);
            setIsSubmitting(false);
        }
    }

    return (
        <>
            <a className="brand-link" href="/">The Blog Squad</a>
            <p className="eyebrow">Join the community</p>
            <h1>Create an account</h1>
            <p>Sign up to publish your own stories and ideas.</p>
            <FormMessage>{error}</FormMessage>
            <form onSubmit={handleSubmit}>
                <label htmlFor="user_id">User ID</label>
                <input id="user_id" name="user_id" type="text" maxLength="255" value={userId} onChange={(event) => setUserId(event.target.value)} autoComplete="username" required />
                <label htmlFor="name">Name</label>
                <input id="name" name="name" type="text" maxLength="255" value={name} onChange={(event) => setName(event.target.value)} autoComplete="name" required />
                <label htmlFor="age">Age <span>(optional)</span></label>
                <input id="age" name="age" type="number" min="13" max="120" value={age} onChange={(event) => setAge(event.target.value)} autoComplete="off" />
                <label htmlFor="occupation">Occupation <span>(optional)</span></label>
                <input id="occupation" name="occupation" type="text" maxLength="255" value={occupation} onChange={(event) => setOccupation(event.target.value)} autoComplete="organization-title" />
                <label htmlFor="city">Current city <span>(optional)</span></label>
                <input id="city" name="city" type="text" maxLength="255" value={city} onChange={(event) => setCity(event.target.value)} autoComplete="address-level2" />
                <label htmlFor="password">Password</label>
                <input id="password" name="password" type="password" maxLength="255" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="new-password" required />
                <button type="submit" disabled={isSubmitting}>{isSubmitting ? "Creating account..." : "Create account"}</button>
            </form>
            <p className="auth-switch">Already have an account? <a href="/signin">Sign in</a></p>
        </>
    );
}

const rootElement = document.getElementById("auth-root");
const root = createRoot(rootElement);
const props = {
    initialError: rootElement.dataset.error,
    initialUserId: rootElement.dataset.userId,
    initialName: rootElement.dataset.name,
    initialAge: rootElement.dataset.age || "",
    initialOccupation: rootElement.dataset.occupation || "",
    initialCity: rootElement.dataset.city || ""
};

root.render(rootElement.dataset.page === "signup" ? <SignUp {...props} /> : <SignIn {...props} />);

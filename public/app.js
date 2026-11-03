const categoryButtons = document.querySelectorAll("#category-nav button");

fetch("/api/blogs")
    .then((response) => {
        if (!response.ok) {
            throw new Error(`Blog API request failed with status ${response.status}`);
        }
        return response.json();
    })
    .then((data) => {
        console.log("Blog API response:", data);
        document.querySelector(".post-count").textContent = `${data.blogs.length} posts`;
    })
    .catch((error) => {
        console.error("Could not load blogs from the API:", error);
    });

categoryButtons.forEach((button) => {
    button.addEventListener("click", () => {
        const selectedCategory = button.dataset.category;

        categoryButtons.forEach((item) => item.classList.remove("active"));
        button.classList.add("active");

        document.querySelectorAll(".post").forEach((post) => {
            const shouldShow =
                selectedCategory === "All" ||
                post.dataset.category === selectedCategory;
            post.hidden = !shouldShow;
        });
    });
});

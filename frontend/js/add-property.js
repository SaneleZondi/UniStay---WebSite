document.addEventListener('DOMContentLoaded', () => {
    // No need for auth alert — page is only accessible from dashboard
    const form = document.getElementById('addPropertyForm');

    form.addEventListener('submit', async e => {
        e.preventDefault();
        const formData = new FormData(form);

        try {
            const response = await fetch('../api/properties/create.php', {
                method: 'POST',
                body: formData,
                credentials: 'include'
            });
            const data = await response.json();

            if (data.error || data.errors) {
                alert(JSON.stringify(data.error || data.errors));
            } else {
                alert('Property added successfully!');
                form.reset();
            }
        } catch (err) {
            console.error(err);
            alert('Error adding property.');
        }
    });
});

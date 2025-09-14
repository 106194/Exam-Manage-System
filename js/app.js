const form = document.getElementById('registerForm');
const messageDiv = document.getElementById('message');

form.addEventListener('submit', async (e) => {
  e.preventDefault();

  const username = document.getElementById('username').value;
  const password = document.getElementById('password').value;

  try {
    const response = await fetch('http://localhost:5000/api/users/register', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ username, password }),
    });

    const data = await response.json();

    if (response.ok) {
      messageDiv.textContent = 'User registered successfully!';
      form.reset();
    } else {
      messageDiv.textContent = `Error: ${data.error || 'Something went wrong'}`;
    }
  } catch (error) {
    messageDiv.textContent = 'Network error: ' + error.message;
  }
});

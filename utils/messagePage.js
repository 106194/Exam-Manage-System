function sendMessagePage(res, title, message, buttonText, buttonLink) {
  res.send(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <title>${title}</title>
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <style>
        @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@400;600&display=swap');

        * {
          box-sizing: border-box;
          margin: 0;
          padding: 0;
        }

        body {
          font-family: 'Poppins', sans-serif;
          background: linear-gradient(135deg, #a1c4fd, #c2e9fb);
          display: flex;
          justify-content: center;
          align-items: center;
          min-height: 100vh;
          padding: 20px;
          animation: fadeIn 1s ease-in;
        }

        @keyframes fadeIn {
          from { opacity: 0; transform: scale(0.95); }
          to { opacity: 1; transform: scale(1); }
        }

        .container {
          background: white;
          padding: 40px 30px;
          border-radius: 20px;
          box-shadow: 0 12px 35px rgba(0, 0, 0, 0.15);
          text-align: center;
          max-width: 500px;
          width: 100%;
          animation: slideIn 0.5s ease-out;
        }

        @keyframes slideIn {
          from { transform: translateY(20px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }

        h1 {
          font-size: 2rem;
          color: #333;
          margin-bottom: 15px;
        }

        p {
          color: #555;
          margin-bottom: 25px;
          font-size: 1.1rem;
        }

        a {
          display: inline-block;
          background: linear-gradient(135deg, #667eea, #764ba2);
          color: white;
          padding: 12px 25px;
          border-radius: 50px;
          text-decoration: none;
          font-weight: bold;
          box-shadow: 0 4px 10px rgba(118, 75, 162, 0.4);
          transition: transform 0.3s ease, box-shadow 0.3s ease;
        }

        a:hover {
          transform: scale(1.05);
          box-shadow: 0 6px 15px rgba(118, 75, 162, 0.5);
        }

        @media (max-width: 480px) {
          .container {
            padding: 30px 20px;
          }

          h1 {
            font-size: 1.5rem;
          }

          p {
            font-size: 1rem;
          }
        }
      </style>
    </head>
    <body>
      <div class="container">
        <h1>${title}</h1>
        <p>${message}</p>
        <a href="${buttonLink}">${buttonText}</a>
      </div>
    </body>
    </html>
  `);
}

module.exports = sendMessagePage;

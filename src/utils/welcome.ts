export const welcome = () => {
  const date = new Date(Date.now());
  const hours = date.getHours();
  let greeting = "";

  // Time-based greeting
  if (hours < 12) {
    greeting = "Good morning! 🌞 Let’s get the day started!";
  } else if (hours < 18) {
    greeting = "Good afternoon! 🌤️ Keep the momentum going!";
  } else {
    greeting = "Good evening! 🌙 Hope you had a fantastic day!";
  }

  return `
      <div style="text-align:center; font-family: 'Verdana', sans-serif; color:#4CAF50; padding: 50px 20px; border-radius: 10px; box-shadow: 0 0 20px rgba(0, 0, 0, 0.1); max-width: 100%; margin: 0 auto; animation: fadeIn 2s;">
        <h1 style="font-size: 48px; color: #FF6347; animation: scaleUp 1s ease-in-out;">Beep-beep! The server is alive and kicking 🚀</h1>
        <p style="font-size: 24px; color: #2F4F4F; animation: slideIn 1.5s ease-in-out;">${greeting}</p>
        <p style="font-size: 20px; color: #3B3B3B;">The current date and time is: <strong style="color: #FF6347;">${date}</strong></p>
        <p style="font-size: 18px; color: #555;">This server is a highly caffeinated web machine ready to serve your requests with super speed!</p>
        <p style="font-size: 22px; color: #2E8B57;">We're up and running with style! 😎</p>
        <p><em style="font-size: 16px;">If you're seeing this message, congratulations – you're looking at a live server! 🎉</em></p>
        <p style="font-size: 16px; color: #888;">Don’t forget to stay awesome! 🌟</p>
  
        <div style="margin-top: 20px; animation: fadeIn 2s;">
          <h3 style="font-size: 24px; color: #32CD32;">Just a few things:</h3>
          <ul style="font-size: 18px; list-style-type: none; padding: 0; color: #4682B4;">
            <li>✅ Server is alive</li>
            <li>✅ Date & time are correct</li>
            <li>✅ Feeling awesome!</li>
          </ul>
        </div>
        <div style="margin-top: 40px; animation: fadeIn 3s;">
          <p style="font-size: 18px; color: #8B0000;">Wait... you’re still here? 🤔 Well, go ahead and try some cool routes! 😄</p>
        </div>
        <div style="margin-top: 40px; animation: fadeIn 4s;">
          <h2 style="font-size: 28px; color: #FFD700;">Let’s create some magic together! ✨</h2>
        </div>
  
        <div style="margin-top: 20px; animation: fadeIn 5s;">
          <h3 style="font-size: 24px; color: #FF1493;">🧑‍💻 Developer Tip:</h3>
          <p style="font-size: 18px; color: #800080;">Every time you refresh this page, the server gets a little more powerful! 💪🔥</p>
        </div>
      </div>
  
      <style>
        @keyframes fadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }
  
        @keyframes scaleUp {
          from {
            transform: scale(0.8);
          }
          to {
            transform: scale(1);
          }
        }
  
        @keyframes slideIn {
          from {
            transform: translateX(-50px);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }
      </style>
    `;
};

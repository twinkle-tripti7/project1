const express = require("express");
const morgan = require("morgan");
const cors = require("cors");
const bodyParser = require("body-parser");
const colors = require("colors");
const dotenv = require("dotenv");
const connectDB = require("./config/db");
const errorHandler = require("./middelwares/errorMiddleware");
const path = require('path');
const helmet = require('helmet');
const http = require("http");
const socketIo = require("socket.io");
const { OpenAIApi, Configuration } = require("openai");



//routes path
const authRoutes = require("./routes/authRoutes");
const openaiRoutes = require("./routes/openaiRoutes");


//dotenv
require('dotenv').config();


//mongo connection
connectDB();

//rest object
const app = express();

const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "http://localhost:3000",
    methods: ["GET", "POST"]
  }
});

io.on("connection", (socket) => {
  console.log("New client connected");
  socket.on("disconnect", () => {
    console.log("Client disconnected");
  });
});



//middlewares
app.use(cors());
app.use(express.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(morgan("dev"));
app.use(errorHandler);

const PORT = process.env.PORT || 6005;

app.use(
  helmet.contentSecurityPolicy({
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "https://apis.google.com"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:"],
      connectSrc: ["'self'", "http://localhost:6005"], // Adjust based on your API
      manifestSrc: ["'self'"],
    },
  })
);

const configuration = new Configuration({
  apiKey: process.env.OPENAI_API_KEY,
});
const openai = new OpenAIApi(configuration);

//API routes
app.use("/api/v1/auth", authRoutes);
app.use("/api/v1/openai", openaiRoutes);

app.use(express.static(path.join(__dirname, 'client', 'public')));

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'client', 'public', 'index.html'));
});

app.post('/api/v1/openai/chatbot', async (req, res) => {
  const { text } = req.body;

  try {
    const response = await openai.createChatCompletion({
      model: 'gpt-4',
      messages: [
        { role: 'system', content: 'You are a helpful assistant.' },
        { role: 'user', content: text }
      ],
    });

    res.json({ response: response.data.choices[0].message.content });
  } catch (error) {
    console.error('Error with OpenAI API:', error);
    res.status(500).json({ error: 'Error with OpenAI API' });
  }
});

//listen server
app.listen(PORT, () => {
  console.log(
    `Server Running in ${process.env.DEV_MODE} mode on port no ${PORT}`.bgCyan
      .white
  );
});

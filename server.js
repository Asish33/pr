const express = require("express");
const session = require("express-session");
const passport = require("passport");
const GitHubStrategy = require("passport-github2").Strategy;
const dotenv = require("dotenv");
const WebSocket = require("ws");
const giveContent = require("./gemini.js");
const prisma = require("./prismaClient.js");

dotenv.config();

const app = express();
const server = require("http").createServer(app);
const wss = new WebSocket.Server({ server });

app.use(express.json());

app.use(
  session({
    secret: process.env.SESSION_SECRET,
    resave: true,
    saveUninitialized: false,
    cookie: { secure: false, httpOnly: true, maxAge: 24 * 60 * 60 * 1000 },
  })
);

app.use(passport.initialize());
app.use(passport.session());

passport.use(
  new GitHubStrategy(
    {
      clientID: process.env.GITHUB_CLIENT_ID,
      clientSecret: process.env.GITHUB_CLIENT_SECRET,
      callbackURL: process.env.GITHUB_CALLBACK_URL,
    },
    async (accessToken, refreshToken, profile, done) => {
      let user = await prisma.user.upsert({
        where: { githubId: profile.id },
        update: { accessToken },
        create: {
          githubId: profile.id,
          username: profile.username,
          accessToken,
        },
      });
      return done(null, user);
    }
  )
);

passport.serializeUser((user, done) => {
  done(null, user.githubId);
});

passport.deserializeUser(async (id, done) => {
  const user = await prisma.user.findUnique({ where: { githubId: id } });
  done(null, user);
});

app.get("/auth/github", (req, res) => {
  const authURL = `https://github.com/login/oauth/authorize?client_id=${
    process.env.GITHUB_CLIENT_ID
  }&redirect_uri=${encodeURIComponent(
    process.env.GITHUB_CALLBACK_URL
  )}&scope=user&prompt=consent`;
  res.redirect(authURL);
});


app.get(
  "/auth/github/callback",
  passport.authenticate("github", {
    failureRedirect: "http://localhost:5173/",
  }),
  (req, res) => {
    if (req.user && req.user.githubId) {
      res.redirect(
        `http://localhost:5173/dashboard?githubId=${req.user.githubId}`
      );
    } else {
      res.redirect("http://localhost:5173/dashboard");
    }
  }
);

app.get("/logout", async (req, res, next) => {
  await req.logout((err) => {
    if (err) return next(err);
    req.session.destroy((err) => {
      if (err) return next(err);
      res.clearCookie("connect.sid", { path: "/" });
      res.redirect("/");
    });
  });
});

app.post("/webhook", async (req, res) => {
  try {
    const { sender, repository } = req.body;

    if (!sender || !repository) {
      return res.status(400).send("Invalid webhook payload");
    }

    const repoName = repository.full_name; // e.g., "user123/my-repo"
    const owner = repository.owner.login; // e.g., "user123"
    const senderName = sender.login; // e.g., "user123"

    console.log(`Webhook received from ${repoName}, triggered by ${senderName}`);

    const input = JSON.stringify(req.body);
    const response = await giveContent(input);

    // Store webhook data in Prisma
    const webhookEntry = await prisma.webhookData.create({
      data: {
        content: response,
        githubId: String(sender.id), // Fix here
        repoName, // Store the repository name
        owner, // Store the repository owner
      },
    });

    // Send updates to WebSocket clients
    wss.clients.forEach((client) => {
      if (
        client.readyState === WebSocket.OPEN &&
        client.githubId === String(sender.id) 
      ) {
        client.send(
          JSON.stringify({
            githubId: sender.id,
            repoName, 
            content: response,
          })
        );
      }
    });

    res.status(200).send(`Webhook received from ${repoName} by ${senderName}`);
  } catch (error) {
    console.error("Error handling webhook:", error);
    res.status(500).send("Internal Server Error");
  }
});

    wss.clients.forEach((client) => {
      if (
        client.readyState === WebSocket.OPEN &&
        client.githubId === sender.id
      ) {
        client.send(
          JSON.stringify({
            githubId: sender.id,
            repoName, // Send repo name to the client
            content: response,
          })
        );
      }
    });


wss.on("connection", (ws) => {
  ws.on("message", async (message) => {
    try {
      const request = JSON.parse(message);
      const data = await prisma.webhookData.findMany({
        where: { githubId: request.githubId },
      });
      ws.githubId = request.githubId; 
      ws.send(JSON.stringify(data));
    } catch (error) {
      console.error("Error fetching data:", error);
      ws.send(JSON.stringify({ error: "Failed to fetch data" }));
    }
  });
});

server.listen(3000, () => {
  console.log("running");
});

process.on("SIGINT", async () => {
  await prisma.$disconnect();
  process.exit(0);
});

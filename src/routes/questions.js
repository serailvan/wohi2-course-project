const express = require("express");
const router = express.Router();
const prisma = require("../lib/prisma");
const authenticate = require("../middleware/auth");
const isOwner = require("../middleware/isOwner");
const multer = require("multer");
const path = require('path');

const storage = multer.diskStorage({
  destination: path.join(__dirname, "..", "..", "public", "uploads"),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${Date.now()}-${Math.random().toString(36).slice(2, 8)}${ext}`);
  },
});

const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith("image/")) cb(null, true);
    else cb(new Error("Only image files are allowed"));
  },
  limits: { fileSize: 5 * 1024 * 1024 },
});

router.use(authenticate);

function formatPost(post, userId) {
  return {
    ...post,
    keywords: post.keywords ? post.keywords.map((k) => k.name || k) : [],
    userName: post.user?.name || null,
    solved: post.attempts ? post.attempts.some(a => a.isCorrect) : false,
  };
}

// GET /questions
router.get("/", async (req, res) => {
  const { keyword } = req.query;
  const userId = req.user.userId || req.user.id;

  const where = keyword
    ? { keywords: { some: { name: keyword } } }
    : {};

  const page = Math.max(1, parseInt(req.query.page) || 1);
  const limit = Math.max(1, Math.min(100, parseInt(req.query.limit) || 5));
  const skip = (page - 1) * limit;

  const [filteredPosts, total] = await Promise.all([
    prisma.post.findMany({
      where,
      include: { 
        keywords: true, 
        user: true,
        attempts: { 
          where: { userId: userId, isCorrect: true }, 
          take: 1 
        }
      },
      orderBy: { id: "asc" },
      skip,
      take: limit,
    }),
    prisma.post.count({ where }),
  ]);

  res.json({
    data: filteredPosts.map(p => formatPost(p, userId)),
    page,
    limit,
    total,
    totalPages: Math.ceil(total / limit),
  });
});

// GET /questions/:postId
router.get("/:postId", async (req, res) => {
  const postId = Number(req.params.postId);
  const userId = req.user.userId || req.user.id;

  const post = await prisma.post.findUnique({
    where: { id: postId },
    include: { 
      keywords: true, 
      user: true,
      attempts: { 
        where: { userId: userId, isCorrect: true }, 
        take: 1 
      }
    },
  });

  if (!post) {
    return res.status(404).json({ message: "Question not found" });
  }

  res.json(formatPost(post, userId));
});

// POST /questions
router.post("/", upload.single("image"), async (req, res) => {
  const { question, answer, keywords } = req.body;

  if (!question || !answer) {
    return res.status(400).json({ msg: "question and answer are mandatory" });
  }

  const keywordsArray = typeof keywords === 'string' 
  ? keywords.split(',').map(k => k.trim()).filter(k => k !== "")
  : [];
  const imageUrl = req.file ? `/uploads/${req.file.filename}` : null;

  const newPost = await prisma.post.create({
    data: {
      question, 
      answer,
      imageUrl,
      userId: req.user.userId || req.user.id,
      keywords: {
        connectOrCreate: keywordsArray.map((kw) => ({
          where: { name: kw }, create: { name: kw },
        })), 
      },
    },
    include: { keywords: true },
  });

  res.status(201).json(formatPost(newPost));
});

// PUT /questions/:postId -> Edit a question
router.put("/:postId", upload.single("image"), isOwner, async (req, res) => {
  const postId = Number(req.params.postId);
  const { question, answer, keywords } = req.body;

  if (!question || !answer) {
    return res.status(400).json({ msg: "question and answer are mandatory" });
  }

  const imageUrl = req.file ? `/uploads/${req.file.filename}` : null;
  const keywordsArray = Array.isArray(keywords) ? keywords : [];

  const updatedPost = await prisma.post.update({
    where: { id: postId },
    data: {
      question, 
      answer,
      imageUrl,
      keywords: {
        set: [],
        connectOrCreate: keywordsArray.map((kw) => ({
          where: { name: kw },
          create: { name: kw },
        })),
      },
    },
    include: { keywords: true },
  });
  res.json(formatPost(updatedPost));
});

// DELETE /questions/:postId
router.delete("/:postId", isOwner, async (req, res) => {
  const postId = Number(req.params.postId);

  const post = await prisma.post.findUnique({
    where: { id: postId },
  });

  if (!post) {
    return res.status(404).json({ message: "Question not found" });
  }

  await prisma.post.delete({ where: { id: postId } });

  res.json({
    message: "Question deleted successfully",
  });
});

// POST /api/questions/:postId/play -> Submit an answer and record the attempt
router.post("/:postId/play", async (req, res) => {
  const postId = Number(req.params.postId);
  const userId = req.user.userId || req.user.id;
  const { answer } = req.body; 

  const post = await prisma.post.findUnique({
    where: { id: postId }
  });

  if (!post) {
    return res.status(404).json({ message: "Question not found" });
  }

  const isCorrect = post.answer.trim().toLowerCase() === String(answer || "").trim().toLowerCase();

  await prisma.attempt.create({
    data: {
      userId: userId,
      postId: postId,
      isCorrect: isCorrect
    }
  });

  res.json({
    correct: isCorrect,
    answer: post.answer 
  });
});

module.exports = router;
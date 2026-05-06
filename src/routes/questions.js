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


// Apply authentication to ALL routes in this router
router.use(authenticate);

function formatPost(post) {
  return {
    ...post,
    keywords: post.keywords.map((k) => k.name),
    userName: post.user?.name || null,
    likeCount: post._count?.likes ?? 0,
    liked: post.likes ? post.likes.length > 0 : false,
    user: undefined,
    likes: undefined,
    _count: undefined,
  };
}

// GET /questions 
// List all questions
router.get("/", async (req, res) => {
  const { keyword } = req.query;

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
          likes: { 
            where: { userId: req.user.userId || req.user.id }, 
            take: 1 
          },
          _count: { 
            select: { likes: true } 
          }
        },
        orderBy: { id: "asc" },
        skip,
        take: limit,
    }),
    prisma.post.count({ where }),
]);

  res.json({
    data: filteredPosts.map(formatPost),
    page,
    limit,
    total,
    totalPages: Math.ceil(total / limit),
  })
});
  
// GET /questions/:id
// Show a specific question
router.get("/:postId", async (req, res) => {
  const postId = Number(req.params.postId);
  const post = await prisma.post.findUnique({
    where: { id: postId },
    include: { 
      keywords: true, 
      user: true,
      likes: { where: { userId: req.user.userId || req.user.id }, take: 1 },
      _count: { select: { likes: true } }
    },
  });

  if (!post) {
    return res.status(404).json({ 
    message: "Question not found" 
    });
  }

  res.json(formatPost(post));
});

// POST /questions
// Create a new question
router.post("/", upload.single("image"), async (req, res) => {
  const { question, answer, keywords } = req.body;

  if (!question || !answer) {
    return res.status(400).json({ msg: 
  "question and answer are mandatory" });
  }

  const keywordsArray = Array.isArray(keywords) ? keywords : [];
  const imageUrl = req.file ? `/uploads/${req.file.filename}` : null;

  const newPost = await prisma.post.create({
    data: {
      question, 
      answer,
      imageUrl,
      userId: req.user.userId,
      keywords: {
        connectOrCreate: keywordsArray.map((kw) => ({
          where: { name: kw }, create: { name: kw },
        })), },
    },
    include: { keywords: true },
  });

  res.status(201).json(formatPost(newPost));
});
  
// PUT /questions/:id
// Edit a post
router.put("/:postId", upload.single("image"), isOwner, async (req, res) =>  {
  const postId = Number(req.params.postId);
  const { question, answer, keywords } = req.body;
  const existingPost = await prisma.post.findUnique({ where: { id: postId } });
  if (!existingPost) {
    return res.status(404).json({ message: "Question not found" });
  }

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

  
// DELETE /questions/:id
// Delete a post
router.delete("/:postId", isOwner, async (req, res) => {
  const postId = Number(req.params.postId);

  const post = await prisma.post.findUnique({
    where: { id: postId },
    include: { keywords: true },
  });

  if (!post) {
    return res.status(404).json({ message: "Question not found" });
  }

  await prisma.post.delete({ where: { id: postId } });

  res.json({
    message: "Question deleted successfully",
    post: formatPost(post),
  });
});

// POST /api/posts/:postId/like
router.post("/:postId/like", async (req, res) => {
  const postId = Number(req.params.postId);

  const post = await prisma.post.findUnique({ where: { id: postId } });
  if (!post) {
      return res.status(404).json({ message: "Post not found" });
  }

  const like = await prisma.like.upsert({
      where: { userId_postId: { userId: req.user.userId || req.user.id, postId } },
      update: {},
      create: { userId: req.user.userId || req.user.id, postId },
  });

  const likeCount = await prisma.like.count({ where: { postId } });

  res.status(201).json({
      id: like.id,
      postId,
      liked: true,
      likeCount,
      createdAt: like.createdAt,
  });
});

// GET /api/questions/:postId/play
// Check if the provided answer is correct for the given question
router.post("/:postId/play", async (req, res) => {
  const postId = Number(req.params.postId);
  
  const { answer } = req.body; 

  const post = await prisma.post.findUnique({
    where: { id: postId }
  });

  if (!post) {
    return res.status(404).json({ message: "Question not found" });
  }

  const isCorrect = post.answer.trim().toLowerCase() === String(answer || "").trim().toLowerCase();

  res.json({
    correct: isCorrect,
    answer: post.answer 
  });
});

module.exports = router;
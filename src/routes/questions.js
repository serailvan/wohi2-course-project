const express = require("express");
const router = express.Router();
const prisma = require("../lib/prisma");

function formatPost(post) {
  return {
    ...post,
    keywords: post.keywords.map((k) => k.name),
  };
}

// GET /questions 
// List all questions
router.get("/", async (req, res) => {
  const { keyword } = req.query;

  const where = keyword
    ? { keywords: { some: { name: keyword } } }
    : {};

  const posts = await prisma.post.findMany({
    where,
    include: { keywords: true },
    orderBy: { id: "asc" },
  });

  res.json(posts.map(formatPost));
});
  
// GET /questions/:id
// Show a specific question
router.get("/:postId", async (req, res) => {
  const postId = Number(req.params.postId);
  const post = await prisma.post.findUnique({
    where: { id: postId },
    include: { keywords: true },
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
router.post("/", async (req, res) => {
  const { question, answer, keywords } = req.body;

  if (!question || !answer) {
    return res.status(400).json({ msg: 
  "question and answer are mandatory" });
  }

  const keywordsArray = Array.isArray(keywords) ? keywords : [];

  const newPost = await prisma.post.create({
    data: {
      question, 
      answer,
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
router.put("/:postId", async (req, res) => {
  const postId = Number(req.params.postId);
  const { question, answer, keywords } = req.body;
  const existingPost = await prisma.post.findUnique({ where: { id: postId } });
  if (!existingPost) {
    return res.status(404).json({ message: "Question not found" });
  }

  if (!question || !answer) {
    return res.status(400).json({ msg: "question and answer are mandatory" });
  }

  const keywordsArray = Array.isArray(keywords) ? keywords : [];
  const updatedPost = await prisma.post.update({
    where: { id: postId },
    data: {
      question, 
      answer,
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
router.delete("/:postId", async (req, res) => {
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

module.exports = router;
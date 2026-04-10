const express = require("express");
const router = express.Router();

const posts = require("../data/posts");

// GET /posts 
// List all posts
router.get("/", (req, res) => {
    res.json(posts);
  });
  
  // GET /posts/:postId
// Show a specific post
router.get("/:postId", (req, res) => {
    const postId = Number(req.params.postId);
  
    const post = posts.find((p) => p.id === postId);
  
    if (!post) {
      return res.status(404).json({ message: "Post not found" });
    }
  
    res.json(post);
  });
  
  // POST /posts
// Create a new post
router.post("/", (req, res) => {
    const { question, answer } = req.body;
  
    if (!question || !answer) {
      return res.status(400).json({
        message: "Question and answer are required"
      });
    }
    const maxId = Math.max(...posts.map(p => p.id), 0);
  
    const newPost = {
      id: posts.length ? maxId + 1 : 1,
      question, answer
    };
    posts.push(newPost);
    res.status(201).json(newPost);
  });
  
  // PUT /posts/:postId
// Edit a post
router.put("/:postId", (req, res) => {
    const postId = Number(req.params.postId);
    const { question, answer } = req.body;
  
    const post = posts.find((p) => p.id === postId);
  
    if (!post) {
      return res.status(404).json({ message: "Post not found" });
    }
  
    if (!question || !answer) {
      return res.json({
        message: "Question and answer are required"
      });
    }
  
    post.question = question;
    post.answer = answer;
  
    res.json(post);
  });
  
// DELETE /posts/:postId
// Delete a post
router.delete("/:postId", (req, res) => {
    const postId = Number(req.params.postId);
  
    const postIndex = posts.findIndex((p) => p.id === postId);
  
    if (postIndex === -1) {
      return res.status(404).json({ message: "Post not found" });
    }
  
    const deletedPost = posts.splice(postIndex, 1);
  
    res.json({
      message: "Post deleted successfully",
      post: deletedPost[0]
    });
  });

module.exports = router;
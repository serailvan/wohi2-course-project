const request = require("supertest");
const app = require("../src/app");
const prisma = require("../src/lib/prisma");

async function resetDb() {
  await prisma.attempt.deleteMany({});
  await prisma.post.deleteMany({});
  await prisma.user.deleteMany({});
}

async function registerAndLogin(
  email = `test-${Date.now()}@test.io`,
  name = "A"
) {
  await request(app)
    .post("/api/auth/register")
    .send({ email, password: "pw12345", name,});

  const res = await request(app)
    .post("/api/auth/login")
    .send({ email, password: "pw12345",});

  return res.body.token;
}

async function createPost(token, overrides = {}) {
  const res = await request(app)
    .post("/api/questions")
    .set("Authorization", `Bearer ${token}`)
    .send({ question: "T", answer: "B", keywords: "C", ...overrides,});

  return res.body;
}

module.exports = { resetDb, registerAndLogin, createPost, request, app, prisma,};
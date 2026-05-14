const { resetDb, registerAndLogin, createPost , request, app, prisma } = require("./helpers");
beforeEach(resetDb);
describe("post tests", () => {
it("returns 401 without a token", async () => {
  const res = await request(app).get("/api/questions");
  expect(res.status).toBe(401);
});

it("returns 404 for unknown post", async () => {
  const token = await registerAndLogin();
  const res = await request(app).get("/api/questions/99999")
    .set("Authorization", `Bearer ${token}`);
  expect(res.status).toBe(404);
  expect(res.body.message).toBe("Question not found");
});

it("returns 400 for invalid post body", async () => {
  const token = await registerAndLogin();
  const res = await request(app).post("/api/questions")
    .set("Authorization", `Bearer ${token}`)
    .send({ question: "" });
  expect(res.status).toBe(400);
});

it("returns 403 when editing someone else's post", async () => {
  const aliceToken = await registerAndLogin("alice@test.io", "Alice");
  const post = await createPost(aliceToken, { question: "Alice's question" });

  const bobToken = await registerAndLogin("bob@test.io", "Bob");
  const res = await request(app).put(`/api/questions/${post.id}`)
    .set("Authorization", `Bearer ${bobToken}`)
    .send({ question: "hijacked", answer: "yes", keywords: "x" });

  expect(res.status).toBe(403);

  const after = await prisma.post.findUnique({ where: { id: post.id } });
  expect(after.question).toBe("Alice's question");  // unchanged
});

});
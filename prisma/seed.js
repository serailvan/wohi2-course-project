const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

const seedQuestions = [
  {
    question: "Question 1",
    answer: "Answer 1",
    keywords: ["http", "web"],
  },
  {
    question: "Question 2",
    answer: "Answer 2",
    keywords: ["http", "api"],
  },
  {
    question: "Question 3",
    answer: "Answer 3",
    keywords: ["javascript", "backend"],
  },
  {
    question: "Question 4",
    answer: "Answer 4",
    keywords: ["database", "backend"],
  },
];

async function main() {
  await prisma.post.deleteMany();
  await prisma.keyword.deleteMany();

  for (const post of seedQuestions) {
    await prisma.post.create({
      data: {
        question: post.question,
        answer: post.answer,
        keywords: {
          connectOrCreate: post.keywords.map((kw) => ({
            where: { name: kw },
            create: { name: kw },
          })),
        },
      },
    });
  }

  console.log("Seed data inserted successfully");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
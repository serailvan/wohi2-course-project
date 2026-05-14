const prisma = require("../lib/prisma");

async function isOwner (req, res, next) {
    const id = Number(req.params.postId);
    const post = await prisma.post.findUnique({
      where: { id },
      include: { keywords: true },
    });

    const { NotFoundError, ForbiddenError } = require("../lib/errors");

    if (!post) throw new NotFoundError("Question not found");
    if (post.userId !== req.user.userId)
      throw new ForbiddenError("You can only modify your own questions");

    // Attach the record to the request so the route handler can reuse it
    req.post = post;
    next();
  
}

module.exports = isOwner;
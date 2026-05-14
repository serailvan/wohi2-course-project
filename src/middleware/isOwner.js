const prisma = require('../lib/prisma');
const {NotFoundError, ValidationError, ForbiddenError} = require("../lib/errors");

async function isOwner (req, res, next) {
    const id = Number(req.params.postId);
    const userId = req.user.userId || req.user.id;
    const post = await prisma.post.findUnique({
      where: { id },
      include: { keywords: true },
    });

    if (!post) throw new NotFoundError("Question not found");
    if (post.userId !== userId)
      throw new ForbiddenError("You can only modify your own questions");

    // Attach the record to the request so the route handler can reuse it
    req.post = post;
    next();
  
}

module.exports = isOwner;
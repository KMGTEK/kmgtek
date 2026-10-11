-- DropForeignKey
ALTER TABLE "blog_comments" DROP CONSTRAINT "blog_comments_postId_fkey";

-- DropForeignKey
ALTER TABLE "blog_post_tags" DROP CONSTRAINT "blog_post_tags_postId_fkey";

-- DropForeignKey
ALTER TABLE "blog_post_tags" DROP CONSTRAINT "blog_post_tags_tagId_fkey";

-- DropForeignKey
ALTER TABLE "blog_posts" DROP CONSTRAINT "blog_posts_authorId_fkey";

-- DropForeignKey
ALTER TABLE "blog_posts" DROP CONSTRAINT "blog_posts_categoryId_fkey";

-- DropTable
DROP TABLE "blog_categories";

-- DropTable
DROP TABLE "blog_comments";

-- DropTable
DROP TABLE "blog_post_tags";

-- DropTable
DROP TABLE "blog_posts";

-- DropTable
DROP TABLE "tags";

-- DropEnum
DROP TYPE "PostStatus";


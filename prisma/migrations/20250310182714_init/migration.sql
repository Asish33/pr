-- CreateTable
CREATE TABLE "User" (
    "githubId" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "accessToken" TEXT NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("githubId")
);

-- CreateTable
CREATE TABLE "WebhookData" (
    "id" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "githubId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WebhookData_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_githubId_key" ON "User"("githubId");

-- AddForeignKey
ALTER TABLE "WebhookData" ADD CONSTRAINT "WebhookData_githubId_fkey" FOREIGN KEY ("githubId") REFERENCES "User"("githubId") ON DELETE CASCADE ON UPDATE CASCADE;

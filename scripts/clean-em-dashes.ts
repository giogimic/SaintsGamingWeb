import fs from 'fs';
import path from 'path';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function cleanMarkdownFiles() {
  const articlesDir = path.join(process.cwd(), 'articles');
  if (!fs.existsSync(articlesDir)) return;

  const files = fs.readdirSync(articlesDir).filter(f => f.endsWith('.md'));
  
  for (const file of files) {
    const filePath = path.join(articlesDir, file);
    let content = fs.readFileSync(filePath, 'utf-8');
    
    // Replace em-dash characters and the weird placeholder ?"
    let replaced = false;
    if (content.includes('—')) {
      content = content.replace(/—/g, ' - ');
      replaced = true;
    }
    // Also catch ?" which is an encoding issue from some AI tools
    if (content.includes('?"')) {
      content = content.replace(/\?"/g, ' - ');
      replaced = true;
    } else if (content.includes('?"')) {
      content = content.replace(/\?"/g, ' - ');
      replaced = true;
    }
    
    if (replaced) {
      fs.writeFileSync(filePath, content);
      console.log(`[File] Cleaned em-dashes in ${file}`);
    }
  }
}

async function cleanDatabase() {
  console.log('Cleaning Thread bodies...');
  const threads = await prisma.thread.findMany();
  for (const thread of threads) {
    if (thread.body.includes('—') || thread.body.includes('?"') || thread.body.includes('?"')) {
      await prisma.thread.update({
        where: { id: thread.id },
        data: {
          body: thread.body.replace(/—/g, ' - ').replace(/\?"/g, ' - ').replace(/\?"/g, ' - ')
        }
      });
      console.log(`[DB] Cleaned Thread: ${thread.title}`);
    }
  }

  console.log('Cleaning Reply bodies...');
  const replies = await prisma.reply.findMany();
  for (const reply of replies) {
    if (reply.body.includes('—') || reply.body.includes('?"') || reply.body.includes('?"')) {
      await prisma.reply.update({
        where: { id: reply.id },
        data: {
          body: reply.body.replace(/—/g, ' - ').replace(/\?"/g, ' - ').replace(/\?"/g, ' - ')
        }
      });
      console.log(`[DB] Cleaned Reply ID: ${reply.id}`);
    }
  }

  console.log('Cleaning NewsArticle bodies...');
  const articles = await prisma.newsArticle.findMany();
  for (const article of articles) {
    let updated = false;
    let newBody = article.body;
    let newExcerpt = article.excerpt;

    if (newBody.includes('—') || newBody.includes('?"') || newBody.includes('?"')) {
      newBody = newBody.replace(/—/g, ' - ').replace(/\?"/g, ' - ').replace(/\?"/g, ' - ');
      updated = true;
    }
    if (newExcerpt && (newExcerpt.includes('—') || newExcerpt.includes('?"') || newExcerpt.includes('?"'))) {
      newExcerpt = newExcerpt.replace(/—/g, ' - ').replace(/\?"/g, ' - ').replace(/\?"/g, ' - ');
      updated = true;
    }

    if (updated) {
      await prisma.newsArticle.update({
        where: { id: article.id },
        data: { body: newBody, excerpt: newExcerpt }
      });
      console.log(`[DB] Cleaned NewsArticle: ${article.title}`);
    }
  }
}

async function main() {
  console.log('Starting em-dash cleanup...');
  await cleanMarkdownFiles();
  try {
    await cleanDatabase();
  } catch (e) {
    console.log('Database cleanup skipped or failed:', e);
  }
  console.log('Cleanup complete!');
}

main().finally(() => prisma.$disconnect());

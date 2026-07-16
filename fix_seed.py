import os, json, glob, re

md_files = glob.glob('articles/*.md')
articles = []

for file in md_files:
    with open(file, 'r', encoding='utf-8') as f:
        content = f.read()
    
    title_m = re.search(r'title:\s*"(.*?)"', content)
    image_m = re.search(r'image:\s*"(.*?)"', content)
    
    title = title_m.group(1) if title_m else ''
    image = image_m.group(1) if image_m else ''
    slug = os.path.basename(file).replace('.md', '')
    
    parts = content.split('---')
    if len(parts) >= 3:
        body = parts[2].strip()
    else:
        body = ''
        
    excerpt = ''
    for line in body.split('\n'):
        line = line.strip()
        if line and not line.startswith('#'):
            excerpt = line
            break
            
    articles.append({
        'title': title,
        'slug': slug,
        'excerpt': excerpt,
        'body': body,
        'coverImage': image,
        'isPublished': True,
        'promoLinks': []
    })

js_array_str = 'const dummyArticles = [\n'
for a in articles:
    js_array_str += '  {\n'
    js_array_str += '    title: ' + json.dumps(a['title']) + ',\n'
    js_array_str += '    slug: ' + json.dumps(a['slug']) + ',\n'
    js_array_str += '    excerpt: ' + json.dumps(a['excerpt']) + ',\n'
    js_array_str += '    body: ' + json.dumps(a['body']) + ',\n'
    js_array_str += '    coverImage: ' + json.dumps(a['coverImage']) + ',\n'
    js_array_str += '    isPublished: true,\n'
    js_array_str += '    promoLinks: []\n'
    js_array_str += '  },\n'
js_array_str += '];\n'

new_file_content = f'''import {{ NextResponse }} from "next/server";
import {{ prisma }} from "@/lib/prisma";
import {{ auth }} from "@/auth";
import {{ PERMISSION_LEVELS }} from "@/lib/permissions";

export async function POST(_req: Request) {{
  try {{
    const session = await auth();
    const permissionLevel = (session?.user?.permissionLevel as number) || 0;
    
    if (permissionLevel < PERMISSION_LEVELS.DEVELOPER) {{
      return NextResponse.json({{ message: "Unauthorized" }}, {{ status: 401 }});
    }}

    const adminUser = await prisma.user.findFirst({{
      where: {{ permissionLevel: {{ gte: 300 }} }}
    }});

    if (!adminUser) {{
      return NextResponse.json({{ message: "No admin user found" }}, {{ status: 400 }});
    }}

{js_array_str}

    let createdCount = 0;

    for (const article of dummyArticles) {{
      const existing = await prisma.newsArticle.findUnique({{
        where: {{ slug: article.slug }}
      }});

      if (!existing) {{
        await prisma.newsArticle.create({{
          data: {{
            title: article.title,
            slug: article.slug,
            excerpt: article.excerpt,
            body: article.body,
            coverImage: article.coverImage,
            isPublished: article.isPublished,
            publishedAt: new Date(),
            authorId: adminUser.id,
            promoLinks: undefined
          }}
        }});
        createdCount++;
      }}
    }}

    // --- Seed Dummy Forums ---
    const communityCat = await prisma.forumCategory.upsert({{
      where: {{ slug: "community" }},
      update: {{}},
      create: {{
        name: "Community",
        slug: "community",
        description: "General discussions, rules, and announcements.",
        order: 1,
        icon: "Home"
      }}
    }});

    const announcementsSub = await prisma.subCategory.upsert({{
      where: {{ slug: "announcements-rules" }},
      update: {{}},
      create: {{
        name: "Announcements & Rules",
        slug: "announcements-rules",
        description: "Important community updates and guidelines.",
        categoryId: communityCat.id,
        order: 1
      }}
    }});

    await prisma.subCategory.upsert({{
      where: {{ slug: "general-discussion" }},
      update: {{}},
      create: {{
        name: "General Discussion",
        slug: "general-discussion",
        description: "Talk about anything related to gaming and the community.",
        categoryId: communityCat.id,
        order: 2
      }}
    }});

    const showcaseSub = await prisma.subCategory.upsert({{
      where: {{ slug: "showcase" }},
      update: {{}},
      create: {{
        name: "Showcase",
        slug: "showcase",
        description: "Show off your gaming setups, art, and projects.",
        categoryId: communityCat.id,
        order: 3
      }}
    }});

    const threadsToCreate = [
      {{
        title: "Welcome to Saints Gaming!",
        slug: "welcome-to-saints-gaming",
        body: "Welcome to the official Saints Gaming community! We're glad to have you here. This is a place to relax, discuss games, and meet new people. Please be respectful to one another and enjoy your stay!",
        subcategoryId: announcementsSub.id,
        isPinned: true,
        isLocked: false
      }},
      {{
        title: "Community Rules & Guidelines",
        slug: "community-rules-guidelines",
        body: "To keep this community a great place for everyone, please follow these rules:\\n\\n1. Treat everyone with respect.\\n2. No spamming or excessive self-promotion.\\n3. Keep conversations civil and welcoming.\\n4. Do not share illicit or inappropriate content.\\n\\nFailure to follow these guidelines may result in a warning or ban. Thank you for helping keep Saints Gaming awesome!",
        subcategoryId: announcementsSub.id,
        isPinned: true,
        isLocked: true
      }},
      {{
        title: "Share your gaming setups!",
        slug: "share-your-gaming-setups",
        body: "Got a cool gaming rig, a massive game collection, or some awesome fan art? Share it here! We'd love to see what our community members are playing on.",
        subcategoryId: showcaseSub.id,
        isPinned: false,
        isLocked: false
      }}
    ];

    let threadsCreated = 0;
    for (const t of threadsToCreate) {{
      const existingThread = await prisma.thread.findUnique({{ where: {{ slug: t.slug }} }});
      if (!existingThread) {{
        await prisma.thread.create({{
          data: {{
            title: t.title,
            slug: t.slug,
            body: t.body,
            subcategoryId: t.subcategoryId,
            authorId: adminUser.id,
            isPinned: t.isPinned,
            isLocked: t.isLocked
          }}
        }});
        threadsCreated++;
      }}
    }}

    return NextResponse.json({{ success: true, message: `Pushed ${{createdCount}} dummy articles and ${{threadsCreated}} forum threads.` }});
  }} catch (error) {{
    console.error("Seed dummy content error:", error);
    return NextResponse.json({{ message: "Internal Server Error" }}, {{ status: 500 }});
  }}
}}
'''

with open('app/api/dev/seed-dummy/route.ts', 'w', encoding='utf-8') as f:
    f.write(new_file_content)

print('Updated successfully.')

const fs = require('fs');
let content = fs.readFileSync('prisma/schema.prisma', 'utf8');

// The weird characters might not be literally '% % %', but let's just slice everything after the last valid bracket
const lastValid = content.lastIndexOf('}');
if (lastValid !== -1) {
  content = content.substring(0, lastValid + 1);
}

const gameCharacterModel = `

// ─── Saints Game ────────────────────────────────────────────────

model GameCharacter {
  id          String   @id @default(cuid())
  userId      String
  user        User     @relation("UserGameCharacters", fields: [userId], references: [id], onDelete: Cascade)
  name        String
  spriteId    String
  classId     String
  stateData   String   @db.Text
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  @@index([userId])
}
`;

fs.writeFileSync('prisma/schema.prisma', content + gameCharacterModel, 'utf8');
console.log('Fixed schema!');

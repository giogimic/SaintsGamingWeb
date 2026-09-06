import re
with open(r'c:\Users\Matth\OneDrive\Desktop\Saints Web\prisma\schema.prisma', 'r', encoding='utf-8') as f:
    content = f.read()

model_def = """model AbilityDictionary {
  slug             String  @id
  name             String
  type             String
  power            Int?
  accuracy         Float?
  cooldown         Int? // Replaces ppCost (GCD mechanic)
  effects          String // JSON array of effect slugs
  animation        String?
  description      String?
  isCapture        Boolean @default(false)
  target           String? // "enemy", "self", "ally", etc.
  domain           String?
  style            String?
  manaCost         Int?
  staminaCost      Int?
  
  // 5-Part Elemental Taxonomy
  element1         String? @default("none")
  element2         String? @default("none")
  skillForm        String? @default("strike")
  skillRole        String? @default("offense")
  
  tags             String? @default("[]") // JSON array
  vfxConfigJson    String? // JSON object
  conditionsJson   String? // JSON object
  consumableItemId String? // Item that teaches this ability
}"""

# Replace the block
content = re.sub(r'model AbilityDictionary \{[^}]*\}', model_def, content, flags=re.MULTILINE)

with open(r'c:\Users\Matth\OneDrive\Desktop\Saints Web\prisma\schema.prisma', 'w', encoding='utf-8') as f:
    f.write(content)

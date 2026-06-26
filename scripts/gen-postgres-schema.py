with open('prisma/schema.prisma', 'r', encoding='utf-8') as f:
    content = f.read()

old_ds = '''datasource db {
  provider = "sqlite"
  url      = env("DATABASE_URL")
}'''

new_ds = '''datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}'''

content = content.replace(old_ds, new_ds)
content = content.replace(
    'generator client {',
    'generator client {\n  output = "../node_modules/.prisma/client"'
)

with open('prisma/schema.postgres.prisma', 'w') as f:
    f.write(content)

print('schema.postgres.prisma regenerated from schema.prisma')

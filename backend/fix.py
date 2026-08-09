with open('app/models.py', 'r', encoding='utf-8') as f:
    content = f.read()

old_str = """class AppFeedback(Base):
    __tablename__ = "app_feedbacks"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(String(10), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)"""

new_str = """class AppFeedback(Base):
    __tablename__ = "app_feedbacks"
    __table_args__ = {'mysql_charset': 'utf8mb4', 'mysql_collate': 'utf8mb4_0900_ai_ci'}
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(String(10, collation="utf8mb4_0900_ai_ci"), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)"""

content = content.replace(old_str, new_str)

with open('app/models.py', 'w', encoding='utf-8') as f:
    f.write(content)

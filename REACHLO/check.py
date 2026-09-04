import re

with open(r'c:\Users\vmohu\Downloads\reachlo-main (2) (1)\reachlo-main (2)\reachlo-main\REACHLO\src\screens\placeholders\AICampaignGenerateScreen.jsx', 'r', encoding='utf-8') as f:
    text = f.read()

def replacer(m):
    return ' ' * len(m.group(0))

text = re.sub(r'"(?:\\.|[^"\\])*"', replacer, text)
text = re.sub(r"'(?:\\.|[^'\\])*'", replacer, text)
text = re.sub(r'/\*[\s\S]*?\*/', replacer, text)
text = re.sub(r'//.*', replacer, text)
text = re.sub(r'`(?:\\.|[^`\\])*`', replacer, text)

# Remove JSX tags! This is crucial because <Text>(optional)</Text> breaks our script
# A simple regex to remove <...> but keep its length
text = re.sub(r'<[^>]*>', replacer, text)

stack = []
pairs = {'{':'}', '[':']', '(':')'}
for i, char in enumerate(text):
    if char in pairs:
        stack.append((char, i))
    elif char in pairs.values():
        if not stack:
            continue
        if pairs[stack[-1][0]] == char:
            stack.pop()
        else:
            line_err = text[:i].count('\n') + 1
            line_opened = text[:stack[-1][1]].count('\n') + 1
            print(f'Mismatched {char} at line {line_err}, expected {pairs[stack[-1][0]]} (opened at line {line_opened})')
            break

print(f'Final stack length: {len(stack)}')
for item in stack[-10:]:
    line = text[:item[1]].count('\n') + 1
    print(f'{item[0]} opened at line {line}')

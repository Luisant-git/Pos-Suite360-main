import sys, re
content = open('Estimation.tsx', 'r', encoding='utf-8').read()

# Remove tax from schemas
content = re.sub(r'\s*tax: z\.coerce\.number\(\)\.optional\(\),', '', content)
# Remove tax from default values
content = content.replace(', tax: 0', '')
content = content.replace("setValue('tax', Number(totalTax.toFixed(2)));", '')

# Remove tax from calculations
content = re.sub(r'let itemTax = 0;\s*if \(settings\?\.enableTax.*?\}', 'let itemTax = 0;', content, flags=re.DOTALL)
content = re.sub(r'if \(item\.tax !== itemTax\).*?\}', '', content, flags=re.DOTALL)

# Remove tax from payload
content = re.sub(r'\s*tax: Number\(data\.tax \|\| 0\),', '', content)
content = re.sub(r'\s*tax: Number\(item\.tax \|\| 0\),', '', content)

# Remove Total Tax UI box
content = re.sub(r'<div className=\"w-full md:w-56 flex flex-col gap-1\">\s*<label className=\"text-\[13px\] font-extrabold text-\[\#1F2937\] uppercase\">Total Tax:</label>.*?</div>', '', content, flags=re.DOTALL)

# Remove tax columns from table header
content = re.sub(r'\{settings\?\.enableTax && \(\s*<>\s*<th[^>]*>Tax %</th>\s*<th[^>]*>Tax Amt</th>\s*</>\s*\)\}', '', content, flags=re.DOTALL)

# Remove tax columns from table body
content = re.sub(r'\{settings\?\.enableTax && \(\s*<>\s*<td.*?</td>\s*<td.*?</td>\s*</>\s*\)\}', '', content, flags=re.DOTALL)

# Remove tax from print receipt
content = re.sub(r'\{settings\?\.enableTax && Number\(watch\(\'tax\'\)\) > 0 && \(.*?\)\}', '', content, flags=re.DOTALL)

open('Estimation.tsx', 'w', encoding='utf-8').write(content)
print('Tax removed')

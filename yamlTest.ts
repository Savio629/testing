import * as fs from 'fs';
import * as yaml from 'js-yaml';
import * as jsonpath from 'jsonpath';

type QuickFixType = 'add' | 'update' | 'delete' | 'append';

interface QuickFix {
  text: any;
  type: QuickFixType;
}

interface QuickFixEntry {
  message: string;
  errorCheck: string;
  quickfix: QuickFix;
}

type QuickFixes = Record<string, QuickFixEntry[]>;

class YamlManipulator {
  private filePath: string;
  jsonData: any;

  constructor(filePath: string) {
    this.filePath = filePath;
    const fileContents = fs.readFileSync(filePath, 'utf8');
    this.jsonData = yaml.load(fileContents);
  }

  applyQuickFix(quickFix: QuickFixEntry): void {
    const { errorCheck, quickfix } = quickFix;
    const { text, type } = quickfix;

    const matchedNodes = jsonpath.query(this.jsonData, errorCheck);

    if (matchedNodes.length > 0) {
      for (const node of matchedNodes) {
        switch (type) {
          case 'add':
            console.log('Applying add fix:', text);
            jsonpath.apply(this.jsonData, errorCheck, (value: any) => {
              if (!Array.isArray(value)) {
                value = [];
              }
              value.push(text);
              return value;
            });
            break;
          case 'update':
            jsonpath.apply(this.jsonData, errorCheck, () => text);
            break;
          case 'delete':
            jsonpath.apply(this.jsonData, errorCheck, () => undefined);
            break;
          case 'append':
            jsonpath.apply(this.jsonData, errorCheck, (value: any) => {
              if (Array.isArray(value)) {
                value.push(text);
              }
              return value;
            });
            break;
        }
      }
    }
  }

  saveChanges(): void {
    const yamlData = yaml.dump(this.jsonData);
    fs.writeFileSync(this.filePath, yamlData, 'utf8');
  }
}

const filePath = 'test.yaml';
const yamlManipulator = new YamlManipulator(filePath);

const quickFixesFilePath = 'quickfixes.yaml';
const quickFixesContents = fs.readFileSync(quickFixesFilePath, 'utf8');
const quickFixes: QuickFixes = yaml.load(quickFixesContents);

for (const quickFixKey in quickFixes) {
  const quickFixList = quickFixes[quickFixKey];
  for (const quickFix of quickFixList) {
    console.log(`Applying quick fix: ${quickFix.message}`);
    console.log("Before applying:", yamlManipulator.jsonData);
    yamlManipulator.applyQuickFix(quickFix);
    console.log("After applying:", yamlManipulator.jsonData);
    console.log(`Quick fix applied for: ${quickFix.message}`);
  }
}

yamlManipulator.saveChanges();
console.log("Quick fixes applied and changes saved.");

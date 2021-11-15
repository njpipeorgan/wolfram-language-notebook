const { readFileSync, writeFileSync } = require("fs");

const file = process.argv.at(2);
syntaxWithVariables = JSON.parse(readFileSync(file).toString());

if (!syntaxWithVariables.variables) {
  return;
}
let {variables, ...syntax} = syntaxWithVariables;
let syntaxStr = JSON.stringify(syntax, null, 1);
let previousSyntaxStr = "";
for (let variable in variables) {
  variables[variable] = JSON.stringify(variables[variable]).slice(1,-1);
}
while (previousSyntaxStr !== syntaxStr) {
  previousSyntaxStr = syntaxStr;
  for (let variable in variables) {
    syntaxStr = syntaxStr.replaceAll(`{{${variable}}}`, variables[variable]);
  }
}

writeFileSync(file, syntaxStr);

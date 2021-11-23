// Copyright 2021 Tianhuan Lu
// 
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
// 
//     http://www.apache.org/licenses/LICENSE-2.0
// 
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

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

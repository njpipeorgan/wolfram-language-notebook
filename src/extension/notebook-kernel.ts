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

import * as vscode from "vscode";
import * as uuid from "uuid";

interface ExecutionItem {
  id: string,
  execution: vscode.NotebookCellExecution,
  started?: boolean,
  hasOutput?: boolean
}

export class ExecutionQueue {
  private queue: ExecutionItem[] = [];

  constructor() {
  }

  empty(): boolean {
    return this.queue.length === 0;
  }

  clear(): void {
    this.queue.forEach(item => {
      this.end(item.id, false);
    });
    this.queue = [];
  }

  push(execution: vscode.NotebookCellExecution): string {
    const id = uuid.v4();
    this.queue.push({ id, execution });
    return id;
  }

  private findIndex(id: string): number {
    return this.queue.findIndex(item => (item.id === id));
  }

  at(index: number): ExecutionItem | null {
    return this.queue[index] || null;
  }

  find(id: string): ExecutionItem | null {
    return this.at(this.findIndex(id));
  }

  remove(id: string): void {
    const index = this.findIndex(id);
    if (index >= 0) {
      this.queue.splice(index, 1);
    }
  }

  start(id: string): void {
    const execution = this.find(id);
    if (execution) {
      execution.execution.start(Date.now());
      execution.started = true;
    }
  }

  end(id: string, succeed: boolean): void {
    const execution = this.find(id);
    if (execution) {
      if (!(execution?.started)) {
        execution.execution.start(Date.now());
      }
      execution.execution.end(succeed, Date.now());
      this.remove(id);
    }
  }

  getNextPendingExecution(): ExecutionItem | null {
    if (this.queue.length > 0 && !(this.queue[0]?.started)) {
      return this.queue[0];
    } else {
      return null;
    }
  }
}

export class MessageHandler {
  handle(message: {[key: string]: any}, queue: ExecutionQueue) {
    const id = message?.uuid || "";
  }
}

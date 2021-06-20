export async function sleep(time) {
  return new Promise((resolve) => {
    setTimeout(resolve, time);
  });
}

class Node {
  constructor() {
    this.next = null;
    this.promise = new Promise((resolve, reject) => {
      this.resolve = () => resolve();
      this.reject = () => reject();
    });
  }

  setNext(node) {
    this.next = node;
  }
}

export class Lock {
  constructor() {
    this.head = null;
    this.tail = null;
  }

  isLocked() {
    return this.head !== null;
  }

  async lock() {
    if (this.head === null) {
      this.head = new Node();
      this.tail = this.head;
      return;
    }
    const prevTail = this.tail;
    this.tail = new Node();
    prevTail.next = this.tail;
    await prevTail.promise;
  }

  unlock() {
    if (this.head === null) {
      return;
    }
    this.head.resolve();
    const prevHead = this.head;
    this.head = prevHead.next;
    prevHead.next = null;
  }
}

export class Semaphore {
  constructor(signal = 1) {
    this.signal = signal;
    this.lock = new Lock();
  }

  async acquire(signalTakes = 1) {
    while (this.signal < signalTakes) {
      await this.lock.lock();
    }
    this.signal -= signalTakes;
  }

  release(signalRelease = 1) {
    this.signal += signalRelease;
    this.lock.unlock();
  }
}

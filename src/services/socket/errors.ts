export class SocketTimeoutError extends Error {
  constructor(message = "Request timed out") {
    super(message);
    this.name = "SocketTimeoutError";
  }
}

export class SocketDisconnectedError extends Error {
  constructor(message = "Socket disconnected before request completed") {
    super(message);
    this.name = "SocketDisconnectedError";
  }
}

export class SocketAuthError extends Error {
  constructor(message = "Authentication failed") {
    super(message);
    this.name = "SocketAuthError";
  }
}

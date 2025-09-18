// middleware/error.js
export const notFoundHandler = (req, res, next) => {
  res.status(404).json({
    success: false,
    error: "Not Found",
  });
};

export const errorHandler = (err, req, res, next) => {
  const statusCode = err.statusCode || err.status || 500;

  // Log full error details (but only to server logs, not sent to client)
  console.error("Unhandled Error:", err.stack || err.message);

  res.status(statusCode).json({
    success: false,
    error: statusCode === 500 ? "Internal Server Error" : err.message,
  });
};

require('dotenv').config();
const app = require('./app');
const connectDB = require('./config/db');
const { scheduleDailyRoiJob } = require('./jobs/roiCron');

const PORT = process.env.PORT || 5000;

const startServer = async () => {
  await connectDB();

  scheduleDailyRoiJob();

  app.listen(PORT, () => {
    console.log(`NexaChain API running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
  });
};

startServer();

// Safety nets for unhandled issues
process.on('unhandledRejection', (err) => {
  console.error('Unhandled Rejection:', err);
});

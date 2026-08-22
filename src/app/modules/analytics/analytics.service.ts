import { CALL_STATUS } from '../../../enums/call';
import { DISPUTE_STATUS } from '../../../enums/dispute';
import { PAYOUT_STATUS } from '../../../enums/payout';
import { USER_ROLES } from '../../../enums/user';
import { Call } from '../call/call.model';
import { Dispute } from '../dispute/dispute.model';
import { Payout } from '../payout/payout.model';
import { User } from '../user/user.model';

const daysAgo = (n: number) => {
  const d = new Date();
  d.setDate(d.getDate() - n);
  d.setHours(0, 0, 0, 0);
  return d;
};

const getDashboard = async () => {
  const startOfToday = daysAgo(0);
  const sevenDaysAgo = daysAgo(6);

  const [
    totalCustomers,
    totalOperators,
    revenueAgg,
    pendingPayoutsAgg,
    callsByStatusToday,
    revenueLast7Days,
    latestCalls,
    openDisputesCount,
    pendingPayoutsCount,
  ] = await Promise.all([
    User.countDocuments({ role: USER_ROLES.USER }),
    User.countDocuments({ role: USER_ROLES.OPERATOR }),
    Call.aggregate([
      { $match: { status: CALL_STATUS.COMPLETED } },
      { $group: { _id: null, total: { $sum: '$costMoney' } } },
    ]),
    Payout.aggregate([
      { $match: { status: PAYOUT_STATUS.PENDING } },
      { $group: { _id: null, total: { $sum: '$amountMoney' } } },
    ]),
    Call.aggregate([
      { $match: { createdAt: { $gte: startOfToday } } },
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]),
    Call.aggregate([
      {
        $match: {
          status: CALL_STATUS.COMPLETED,
          endedAt: { $gte: sevenDaysAgo },
        },
      },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$endedAt' } },
          revenue: { $sum: '$costMoney' },
        },
      },
      { $sort: { _id: 1 } },
    ]),
    Call.find()
      .sort({ createdAt: -1 })
      .limit(10)
      .populate('customerId', 'name')
      .populate('operatorId', 'name')
      .populate('destinationId', 'name'),
    Dispute.countDocuments({ status: DISPUTE_STATUS.OPEN }),
    Payout.countDocuments({ status: PAYOUT_STATUS.PENDING }),
  ]);

  return {
    totalCustomers,
    totalOperators,
    totalRevenue: revenueAgg[0]?.total ?? 0,
    pendingPayouts: pendingPayoutsAgg[0]?.total ?? 0,
    revenueLast7Days: revenueLast7Days.map((r) => ({
      date: r._id,
      revenue: r.revenue,
    })),
    callsByStatusToday: callsByStatusToday.map((c) => ({
      status: c._id,
      count: c.count,
    })),
    latestCalls,
    needsAttention: {
      openDisputes: openDisputesCount,
      pendingPayouts: pendingPayoutsCount,
    },
  };
};

const getAnalytics = async (days: number) => {
  const since = daysAgo(days - 1);

  const [
    revenueAgg,
    callsCount,
    operatorEarningsAgg,
    revenueTrend,
    callsByStatusWeekly,
    topOperators,
    topCustomers,
    topDestinations,
  ] = await Promise.all([
    Call.aggregate([
      { $match: { status: CALL_STATUS.COMPLETED, endedAt: { $gte: since } } },
      { $group: { _id: null, total: { $sum: '$costMoney' } } },
    ]),
    Call.countDocuments({ createdAt: { $gte: since } }),
    Call.aggregate([
      { $match: { status: CALL_STATUS.COMPLETED, endedAt: { $gte: since } } },
      { $group: { _id: null, total: { $sum: '$operatorEarnings' } } },
    ]),
    Call.aggregate([
      { $match: { status: CALL_STATUS.COMPLETED, endedAt: { $gte: since } } },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$endedAt' } },
          revenue: { $sum: '$costMoney' },
        },
      },
      { $sort: { _id: 1 } },
    ]),
    Call.aggregate([
      { $match: { createdAt: { $gte: since } } },
      {
        $group: {
          _id: { $dayOfWeek: '$createdAt' },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]),
    Call.aggregate([
      { $match: { status: CALL_STATUS.COMPLETED, endedAt: { $gte: since }, operatorId: { $exists: true } } },
      {
        $group: {
          _id: '$operatorId',
          earnings: { $sum: '$operatorEarnings' },
          calls: { $sum: 1 },
        },
      },
      { $sort: { earnings: -1 } },
      { $limit: 5 },
      {
        $lookup: { from: 'users', localField: '_id', foreignField: '_id', as: 'user' },
      },
      { $unwind: '$user' },
      { $project: { name: '$user.name', earnings: 1, calls: 1 } },
    ]),
    Call.aggregate([
      { $match: { status: CALL_STATUS.COMPLETED, endedAt: { $gte: since } } },
      {
        $group: {
          _id: '$customerId',
          spend: { $sum: '$costMoney' },
        },
      },
      { $sort: { spend: -1 } },
      { $limit: 5 },
      {
        $lookup: { from: 'users', localField: '_id', foreignField: '_id', as: 'user' },
      },
      { $unwind: '$user' },
      { $project: { name: '$user.name', spend: 1 } },
    ]),
    Call.aggregate([
      { $match: { createdAt: { $gte: since } } },
      { $group: { _id: '$destinationId', calls: { $sum: 1 } } },
      { $sort: { calls: -1 } },
      {
        $lookup: { from: 'destinations', localField: '_id', foreignField: '_id', as: 'destination' },
      },
      { $unwind: '$destination' },
      { $project: { name: '$destination.name', calls: 1 } },
    ]),
  ]);

  return {
    revenue: revenueAgg[0]?.total ?? 0,
    callsCount,
    operatorEarnings: operatorEarningsAgg[0]?.total ?? 0,
    revenueTrend: revenueTrend.map((r) => ({ date: r._id, revenue: r.revenue })),
    callsByStatusWeekly: callsByStatusWeekly.map((c) => ({
      dayOfWeek: c._id,
      count: c.count,
    })),
    topOperators,
    topCustomers,
    topDestinations,
  };
};

export const AnalyticsService = { getDashboard, getAnalytics };

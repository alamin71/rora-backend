import { StatusCodes } from 'http-status-codes';
import AppError from '../../../errors/AppError';
import {
  IPolicyPage,
  POLICY_PAGE_TYPES,
  PolicyPageType,
  PolicyPage,
} from './policy-page.model';

const DEFAULT_POLICY_PAGE_TITLES: Record<PolicyPageType, string> = {
  'privacy-policy': 'Privacy Policy',
  'terms-conditions': 'Terms & Conditions',
  'about-app': 'About This App',
};

const normalizePolicyPageType = (type: string): PolicyPageType => {
  if (!POLICY_PAGE_TYPES.includes(type as PolicyPageType)) {
    throw new AppError(StatusCodes.BAD_REQUEST, 'Invalid policy page type');
  }

  return type as PolicyPageType;
};

const getOrCreatePolicyPage = async (type: PolicyPageType) => {
  const existingPage = await PolicyPage.findOne({ type });

  if (existingPage) {
    return existingPage;
  }

  return PolicyPage.create({
    type,
    title: DEFAULT_POLICY_PAGE_TITLES[type],
    content: '',
  });
};

const getPolicyPagesFromDB = async () => {
  await Promise.all(
    POLICY_PAGE_TYPES.map(async (type) => {
      await getOrCreatePolicyPage(type);
    })
  );

  return PolicyPage.find().sort({ type: 1 });
};

const getPolicyPageFromDB = async (type: string) => {
  const normalizedType = normalizePolicyPageType(type);
  return getOrCreatePolicyPage(normalizedType);
};

const createPolicyPageFromDB = async (
  type: string,
  payload: Partial<Pick<IPolicyPage, 'title' | 'content'>>
) => {
  const normalizedType = normalizePolicyPageType(type);
  const existingPage = await PolicyPage.findOne({ type: normalizedType });

  if (existingPage) {
    throw new AppError(StatusCodes.BAD_REQUEST, 'Policy page already exists');
  }

  const createdPage = await PolicyPage.create({
    type: normalizedType,
    title: payload.title || DEFAULT_POLICY_PAGE_TITLES[normalizedType],
    content: payload.content || '',
  });

  return createdPage;
};

const updatePolicyPageFromDB = async (
  type: string,
  payload: Partial<Pick<IPolicyPage, 'title' | 'content'>>
) => {
  const normalizedType = normalizePolicyPageType(type);

  const setValues: Partial<IPolicyPage> = {
    ...payload,
    type: normalizedType,
  };

  const setOnInsertValues: Partial<IPolicyPage> = {};

  if (payload.title === undefined) {
    setOnInsertValues.title = DEFAULT_POLICY_PAGE_TITLES[normalizedType];
  }

  if (payload.content === undefined) {
    setOnInsertValues.content = '';
  }

  const updatedPage = await PolicyPage.findOneAndUpdate(
    { type: normalizedType },
    {
      $set: setValues,
      $setOnInsert: setOnInsertValues,
    },
    {
      new: true,
      upsert: true,
      runValidators: true,
      setDefaultsOnInsert: true,
    }
  );

  if (!updatedPage) {
    throw new AppError(StatusCodes.BAD_REQUEST, 'Failed to update policy page');
  }

  return updatedPage;
};

export const PolicyPageService = {
  getPolicyPagesFromDB,
  getPolicyPageFromDB,
  createPolicyPageFromDB,
  updatePolicyPageFromDB,
};

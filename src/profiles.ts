// @ts-nocheck
import { repo } from "./repo.js";
export const profiles = { list: () => repo.listBranches(), current: () => repo.currentBranch(), create: (name) => repo.createBranch(name), switchTo: (name) => repo.checkoutBranch(name) };
export const { list, current, create, switchTo } = profiles;

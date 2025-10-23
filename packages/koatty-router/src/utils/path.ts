/*
 * @Description: 
 * @Usage: 
 * @Author: richen
 * @Date: 2024-01-07 22:33:25
 * @LastEditTime: 2024-11-07 11:00:23
 * @License: BSD (3-Clause)
 * @Copyright (c): <richenlin(at)gmail.com>
 */
import { promises as fsPromise } from "fs";
import { DefaultLogger as logger } from "koatty_logger";

/**
 * @description: 
 * @param {string} path
 * @return {*}
 */
export function parsePath(opath: string): string {
  let path = opath || "/";
  
  // Replace multiple consecutive slashes with single slash
  path = path.replace(/\/+/g, '/');
  
  // Remove trailing slash (except for root path)
  if (path.length > 1 && path.endsWith("/")) {
    path = path.slice(0, path.length - 1);
  }
  
  return path;
}

/**
 * @description: Asynchronously delete multiple files based on the given file paths
 * @param {Record} files
 * @param {*} param2
 * @return {*}
 */
export async function deleteFiles(files: Record<string, { path: string }>) {
  const deletePromises = Object.keys(files).map(async (key) => {
    try {
      const filePath = files[key].path;
      await fsPromise.access(filePath);
      await fsPromise.unlink(filePath);
    } catch (error) {
      logger.Error(error);
    }
  });

  return Promise.all(deletePromises);
};
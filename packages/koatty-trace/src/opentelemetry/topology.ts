/**
 * 
 * @Description: 链路拓扑分析器
 * @Author: richen
 * @Date: 2025-04-06 12:40:00
 * @LastEditTime: 2025-04-06 12:40:00
 * @License: BSD (3-Clause)
 * @Copyright (c): <richenlin(at)gmail.com>
 */
import { DefaultLogger as logger } from "koatty_logger";

interface ServiceNode {
  name: string;
  dependencies: Set<string>;
}

/**
 * A singleton class for analyzing and managing service topology dependencies.
 * Provides functionality to record, query and visualize service dependencies.
 * 
 * @example
 * ```ts
 * const analyzer = TopologyAnalyzer.getInstance();
 * analyzer.recordServiceDependency('serviceA', 'serviceB');
 * const deps = analyzer.getServiceDependencies('serviceA');
 * ```
 * 
 * @class TopologyAnalyzer
 */
export class TopologyAnalyzer {
  private static instance: TopologyAnalyzer;
  private serviceMap: Map<string, ServiceNode>;

  private constructor() {
    this.serviceMap = new Map();
  }

  public static getInstance(): TopologyAnalyzer {
    if (!TopologyAnalyzer.instance) {
      TopologyAnalyzer.instance = new TopologyAnalyzer();
    }
    return TopologyAnalyzer.instance;
  }

  public recordServiceDependency(source: string, target: string) {
    if (!this.serviceMap.has(source)) {
      this.serviceMap.set(source, {
        name: source,
        dependencies: new Set()
      });
    }

    if (target && !this.serviceMap.get(source)!.dependencies.has(target)) {
      this.serviceMap.get(source)!.dependencies.add(target);
      logger.debug(`Recorded service dependency: ${source} -> ${target}`);
    }
  }

  public getServiceDependencies(serviceName: string): string[] {
    const node = this.serviceMap.get(serviceName);
    return node ? Array.from(node.dependencies) : [];
  }

  public getFullTopology(): Record<string, string[]> {
    const result: Record<string, string[]> = {};
    this.serviceMap.forEach((node, name) => {
      result[name] = Array.from(node.dependencies);
    });
    return result;
  }

  public visualizeTopology(): string {
    let graph = 'digraph G {\n';
    this.serviceMap.forEach((node) => {
      node.dependencies.forEach((dep) => {
        graph += `  "${node.name}" -> "${dep}";\n`;
      });
    });
    graph += '}';
    return graph;
  }
}

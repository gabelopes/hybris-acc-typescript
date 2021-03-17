/// <reference path="./ACCModuleLoader.ts" />

import Autoload from "./Autoload";
import Predicative, { testPredicative } from "./Predicative";

const ACC_CONFIGURATION_PROPERTY = "__ACC__";

interface Constructor<T> {
  new (...args: any[]): T;
}

export interface ACCConfiguration<T> {
  name?: string;
  autoload?: Autoload<T>[];
  condition?: Predicative;
}

export default function ACC<T>(
  name?: string | ACCConfiguration<T>,
  autoload = (name as ACCConfiguration<T>)?.autoload,
  condition = (name as ACCConfiguration<T>)?.condition
) {
  if (!testPredicative(condition)) { return; }

  return (accClass: Constructor<T>) => {
    let configuration: ACCConfiguration<T>;

    if (typeof name === "string") {
      configuration = { name, autoload, condition };
    } else {
      configuration = name;
    }

    accClass[ACC_CONFIGURATION_PROPERTY] = configuration ?? {};
  };
}

export function requireACC(accModuleName: string) {
  return ACCModuleLoader.requireACC(accModuleName);
}

const ACCModuleLoader = (() => {
  const ACC_MODULE_PARTS_REGEX = /[\/.]/;
  const ACC_PROPERTY = "ACC";
  const ACC_CONFIGURATION_PROPERTY = "__ACC__";
  const AUTOLOAD_PROPERTY = "_autoload";
  const INITIALIZER_PROPERTY = "__initialize__";
  const MODULE_PROPERTY = "__module__";
  const EXTENDS_FUNCTION_NAME = "__extends";
  const CALL_PROPERTY = "call";
  const APPLY_PROPERTY = "apply";
  const PROTOTYPE_PROPERTY = "prototype";

  const ACC = window[ACC_PROPERTY] ??= {};
  const MODULES = {};

  function requireModule(modulePath: string) {
    return MODULES[modulePath];
  }

  function requireACCModule(accModuleName?: string) {
    const accModuleParts = (accModuleName ?? "").split(ACC_MODULE_PARTS_REGEX);
    let accModule = ACC;

    for (const accModulePart of accModuleParts) {
      accModule = accModule[accModulePart];

      if (!accModule) {
        return null;
      }
    }

    return accModule;
  }

  function defineModule(modulePath: string, imports: string[], moduleDefinition: any): void {
    const [, , ...moduleImports] = imports;
    const exports = (MODULES[modulePath] ??= {});
    const resolvedModuleImports = moduleImports.map(requireModule);

    moduleDefinition(requireModule, exports, ...resolvedModuleImports);
    processModule(exports);
  }

  function processModule(exports: any): void {
    for (const exportName in exports) {
      const exported = exports[exportName];

      if (isACCClass(exported)) {
        const accConfiguration = exported[ACC_CONFIGURATION_PROPERTY];
        const accModule = createACCModule(exported, accConfiguration);

        replaceExportedProperty(exports, exportName, exported, accConfiguration);
        defineImmutableProperty(accModule, MODULE_PROPERTY, exported);
      } else {
        defineImmutableProperty(exports, exportName, exported);
      }
    }
  }

  function replaceExportedProperty(exports: any, exportName: string, accClass: any, accConfiguration: any): void {
    const accModuleName = accConfiguration.name ?? accClass.name;

    Object.defineProperty(exports, exportName, {
      get: () => {
        return requireACCModule(accModuleName);
      },
      set: () => {}
    });
  }

  function defineImmutableProperty(object: any, propertyName: string, propertyValue: any): void {
    Object.defineProperty(object, propertyName, {
      get: () => {
        return propertyValue;
      },
      set: () => {}
    });
  }

  function isACCClass(exported: any): boolean {
    return !!exported[ACC_CONFIGURATION_PROPERTY];
  }

  function createACCModule(accClass: any, accConfiguration: any): any {
    const accModuleName = accConfiguration.name ?? accClass.name;

    if (!accModuleName) {
      return console.error("ACC module has unknown name/path.");
    }

    const accModule = getOrCreateACCModule(accModuleName);

    buildAutoload(accModule, accClass, accConfiguration);
    buildMethods(accModule, accClass);
    buildProperties(accModule, accClass);

    return accModule;
  }

  function getOrCreateACCModule(accModuleName: string) {
    const accModuleParts = accModuleName.split(ACC_MODULE_PARTS_REGEX);
    let accModule = ACC;

    for (const accModulePart of accModuleParts) {
      accModule = accModule[accModulePart] ??= {};
    }

    return accModule;
  }

  function buildAutoload(module: any, accClass: any, accConfiguration: any): void {
    const autoload = module[AUTOLOAD_PROPERTY] = [];

    if (typeof accClass === "function") {
      buildInitializer(module, accClass);
    }

    populateAutoload(autoload, accConfiguration.autoload);
  }

  function buildInitializer(module: any, accClass: any): void {
    module[INITIALIZER_PROPERTY] = accClass.bind(module);
    module[AUTOLOAD_PROPERTY].push(INITIALIZER_PROPERTY);
  }

  function populateAutoload(autoload: any[], accModuleAutoload: any[]): void {
    if (!accModuleAutoload) { return; }

    for (const autoloadDeclaration of accModuleAutoload) {
      if (typeof autoloadDeclaration === "string") {
        autoload.push(autoloadDeclaration);
      } else {
        populateAutoloadPredicative(autoload, autoloadDeclaration);
      }
    }
  }

  function populateAutoloadPredicative(autoload: any[], autoloadPredicative: any): void {
    const { method, condition, otherwise } = autoloadPredicative;

    if (typeof condition === "boolean") {
      if (condition) {
        autoload.push(method);
      } else {
        autoload.push(otherwise);
      }
    } else {
      autoload.push(method, condition, otherwise);
    }
  }

  function buildMethods(module: any, accClass: any): void {
    const methods = accClass.prototype;

    for (const property in methods) {
      const candidateMethod = methods[property];

      if (typeof candidateMethod === "function") {
        module[property] = candidateMethod.bind(module);
      }
    }
  }

  function buildProperties(module: any, accClass: any): void {
    for (const propertyName in accClass) {
      if (!accClass.hasOwnProperty(propertyName)) { continue; }

      const property = accClass[propertyName];

      if (typeof property === "function") {
        module[propertyName] = property.bind(module);
      } else {
        module[propertyName] = property;
      }
    }

    if (hasParentPrototype(accClass)) {
      buildProperties(module, accClass.__proto__);
    }
  }

  function hasParentPrototype(accClass: any): boolean {
    return !!accClass?.__proto__?.__proto__;
  }

  function redefineExtends(): void {
    const extendClass: any = window[EXTENDS_FUNCTION_NAME];

    window[EXTENDS_FUNCTION_NAME] = (accClass: any, extension: any) => {
      const isACCModule = typeof extension !== "function";
      let superClass = extension;

      if (isACCModule) {
        superClass = extension[MODULE_PROPERTY];
      }

      extendClass(accClass, superClass);

      if (isACCModule) {
        defineSuperProperties(accClass, extension, superClass);
      }
    };
  }

  function defineSuperProperties(accClass: any, superACCModule: any, superACCClass: any): void {
    defineCall(superACCModule, superACCClass);
    defineApply(accClass, superACCModule, superACCClass);
    definePrototype(superACCModule, superACCClass);
  }

  function defineCall(superACCModule: any, superACCClass: any): void {
    const accModuleCall = superACCModule[CALL_PROPERTY];

    superACCModule[CALL_PROPERTY] = (thisArg: any, ...args: any[]) => {
      if (thisArg) {
        superACCClass.call(thisArg, ...args);
        superACCModule.apply(null);
      }

      if (accModuleCall) {
        superACCModule[CALL_PROPERTY] = accModuleCall;
      } else {
        delete superACCModule[CALL_PROPERTY];
      }
    };
  }

  function defineApply(accClass: any, superACCModule: any, superACCClass: any): void {
    const accModuleApply = superACCModule[APPLY_PROPERTY];

    superACCModule[APPLY_PROPERTY] = (thisArg: any, args: any[]) => {
      if (thisArg) {
        const accConfiguration = accClass[ACC_CONFIGURATION_PROPERTY];
        const accModule = requireACCModule(accConfiguration.name);

        superACCClass.apply(accModule, args);
        superACCModule.call(null);
      }

      if (accModuleApply) {
        superACCModule[APPLY_PROPERTY] = accModuleApply;
      } else {
        delete superACCModule[APPLY_PROPERTY];
      }
    };
  }

  function definePrototype(superACCModule: any, superACCClass: any): void {
    superACCModule[PROTOTYPE_PROPERTY] = superACCClass[PROTOTYPE_PROPERTY];
  }

  redefineExtends();

  return { define: defineModule, require: requireModule, requireACC: requireACCModule };
})();

function define(modulePath: string, imports: string[], moduleDefinition: any) {
  window.setTimeout(() => {
    ACCModuleLoader.define(modulePath, imports, moduleDefinition);
  }, 0);
}

function require(modulePath: string) {
  ACCModuleLoader.require(modulePath);
}

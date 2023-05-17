package net.webpdf.codegen;

import io.swagger.codegen.v3.*;
import io.swagger.codegen.v3.generators.DefaultCodegenConfig;
import io.swagger.v3.oas.models.media.*;
import io.swagger.v3.oas.models.parameters.Parameter;
import io.swagger.v3.oas.models.parameters.RequestBody;
import net.webpdf.codegen.extension.WebPDFExtension;
import net.webpdf.codegen.extension.index.Index;
import net.webpdf.codegen.extension.index.IndexEntry;
import net.webpdf.codegen.names.ModelName;
import net.webpdf.codegen.names.TypeName;
import org.apache.commons.lang3.StringUtils;
import org.apache.commons.text.StringEscapeUtils;

import java.io.File;
import java.util.*;
import java.util.stream.Collectors;

import static net.webpdf.codegen.extension.WebPDFExtensionKey.*;
import static net.webpdf.codegen.extension.WebPDFExtensionKey.PARENT_CLASS_NAME;

public class TypeScriptFetchEnhancedClientCodegen extends DefaultCodegenConfig {

    private static final String UNDEFINED_VALUE = "undefined";

    protected String modelPropertyNaming = "camelCase";
    protected Boolean supportsES6 = true;
    protected HashSet<String> languageGenericTypes;

    public TypeScriptFetchEnhancedClientCodegen() {
        super();

        // clear import mapping (from default generator) as TS does not use it
        // at the moment
        importMapping.clear();

        supportsInheritance = true;
        setReservedWordsLowerCase(Arrays.asList(
                // local variable names used in API methods (endpoints)
                "varLocalPath", "queryParameters", "headerParams", "formParams", "useFormData", "varLocalDeferred",
                "requestOptions",
                // Typescript reserved words
                "abstract", "await", "boolean", "break", "byte", "case", "catch", "char", "class", "const", "continue",
                "debugger", "default", "delete", "do", "double", "else", "enum", "export", "extends", "false", "final",
                "finally", "float", "for", "function", "goto", "if", "implements", "import", "in", "instanceof", "int",
                "interface", "let", "long", "native", "new", "null", "package", "private", "protected", "public",
                "return", "short", "static", "super", "switch", "synchronized", "this", "throw", "transient", "true",
                "try", "typeof", "var", "void", "volatile", "while", "with", "yield"
        ));

        languageSpecificPrimitives = new HashSet<>(Arrays.asList(
                "string",
                "String",
                "boolean",
                "Boolean",
                "Double",
                "Integer",
                "Long",
                "Float",
                "Object",
                "Array",
                "Date",
                "number",
                "any",
                "File",
                "Error",
                "Map"
        ));

        languageGenericTypes = new HashSet<>(List.of(
                "Array"
        ));

        instantiationTypes.put("array", "Array");

        typeMapping = new HashMap<>();
        typeMapping.put("Array", "Array");
        typeMapping.put("array", "Array");
        typeMapping.put("List", "Array");
        typeMapping.put("boolean", "boolean");
        typeMapping.put("string", "string");
        typeMapping.put("int", "number");
        typeMapping.put("float", "number");
        typeMapping.put("number", "number");
        typeMapping.put("BigDecimal", "number");
        typeMapping.put("long", "number");
        typeMapping.put("short", "number");
        typeMapping.put("char", "string");
        typeMapping.put("double", "number");
        typeMapping.put("object", "any");
        typeMapping.put("integer", "number");
        typeMapping.put("Map", "any");
        typeMapping.put("date", "string");
        typeMapping.put("DateTime", "Date");
        //TODO binary should be mapped to byte array
        // mapped to String as a workaround
        typeMapping.put("binary", "string");
        typeMapping.put("ByteArray", "string");
        typeMapping.put("UUID", "string");
        typeMapping.put("File", "any");
        typeMapping.put("Error", "Error");

        cliOptions.add(new CliOption(CodegenConstants.MODEL_PROPERTY_NAMING,
                CodegenConstants.MODEL_PROPERTY_NAMING_DESC).defaultValue("camelCase"));
        cliOptions.add(new CliOption(CodegenConstants.SUPPORTS_ES6,
                CodegenConstants.SUPPORTS_ES6_DESC).defaultValue("false"));

        this.outputFolder = "generated-code" + File.separator + "typescript-fetch";
    }

    @Override
    public void processOpts() {
        super.processOpts();

        if (additionalProperties.containsKey(CodegenConstants.MODEL_PROPERTY_NAMING)) {
            setModelPropertyNaming((String) additionalProperties.get(CodegenConstants.MODEL_PROPERTY_NAMING));
        }

        if (additionalProperties.containsKey(CodegenConstants.SUPPORTS_ES6)) {
            setSupportsES6(Boolean.valueOf(additionalProperties.get(CodegenConstants.SUPPORTS_ES6).toString()));
            additionalProperties.put("supportsES6", getSupportsES6());
        }

        modelTemplateFiles.put("model.mustache", ".ts");

        supportingFiles.add(new SupportingFile("parameter.mustache", "", "Parameter.ts"));
        supportingFiles.add(new SupportingFile("index.mustache", "", "index.ts"));
    }

    @Override
    protected void addAdditionPropertiesToCodeGenModel(CodegenModel codegenModel, Schema schema) {
        if (schema instanceof MapSchema && hasSchemaProperties(schema)) {
            codegenModel.additionalPropertiesType = getTypeDeclaration(
                    (Schema<?>) schema.getAdditionalProperties());
            addImport(codegenModel, codegenModel.additionalPropertiesType);
        } else if (schema instanceof MapSchema && hasTrueAdditionalProperties(schema)) {
            codegenModel.additionalPropertiesType = getTypeDeclaration(new ObjectSchema());
        }
    }

    @Override
    public void addImport(CodegenModel codegenModel, String type) {
        if (type == null) {
            return;
        }
        String[] names = type.split("( [|&] )|[<>]");
        for (String name : names) {
            if (needToImport(name)) {
                codegenModel.imports.add(name);
            }
        }
    }

    @Override
    public String escapeReservedWord(String name) {
        if (this.reservedWordsMappings().containsKey(name)) {
            return this.reservedWordsMappings().get(name);
        }
        return "_" + name;
    }

    @Override
    public String escapeQuotationMark(String input) {
        // remove ', " to avoid code injection
        return input.replace("\"", "").replace("'", "");
    }

    @Override
    public String escapeUnsafeCharacters(String input) {
        return input.replace("*/", "*_/")
                .replace("/*", "/_*");
    }

    @Override
    public String toOperationId(String operationId) {
        // throw exception if method name is empty
        if (StringUtils.isEmpty(operationId)) {
            throw new RuntimeException("Empty method name (operationId) not allowed");
        }

        // method name cannot use reserved keyword, e.g. return
        // append _ at the beginning, e.g. _return
        if (isReservedWord(operationId)) {
            return escapeReservedWord(camelize(sanitizeName(operationId), true));
        }

        return camelize(sanitizeName(operationId), true);
    }

    @Override
    public String toEnumValue(String value, String datatype) {
        if ("number".equals(datatype)) {
            return value;
        } else {
            return "'" + escapeText(value) + "'";
        }
    }

    @Override
    public String toEnumDefaultValue(String value, String datatype) {
        return datatype + "_" + value;
    }

    @Override
    public String toEnumVarName(String name, String datatype) {
        if (name.length() == 0) {
            return "Empty";
        }

        // for symbol, e.g. $, #
        if (getSymbolName(name) != null) {
            return camelize(getSymbolName(name));
        }

        // number
        if ("number".equals(datatype)) {
            String varName = "NUMBER_" + name;

            varName = varName.replaceAll("-", "MINUS_");
            varName = varName.replaceAll("\\+", "PLUS_");
            varName = varName.replaceAll("\\.", "_DOT_");
            return varName;
        }

        // string
        String enumName = sanitizeName(name);
        enumName = enumName.replaceFirst("^_", "");
        enumName = enumName.replaceFirst("_$", "");

        // camelize the enum variable name
        // ref: https://basarat.gitbooks.io/typescript/content/docs/enums.html
        enumName = camelize(enumName);

        if (enumName.matches("\\d.*")) { // starts with number
            return "_" + enumName;
        } else {
            return enumName;
        }
    }

    @Override
    public String toEnumName(CodegenProperty property) {
        String enumName = toModelName(property.name) + "Enum";

        if (enumName.matches("\\d.*")) { // starts with number
            return "_" + enumName;
        } else {
            return enumName;
        }
    }

    @Override
    public String toParamName(String name) {
        // should be the same as variable name
        return toVarName(name);
    }

    @Override
    public String toVarName(String name) {
        // sanitize name
        name = sanitizeName(name);

        if ("_".equals(name)) {
            name = "_u";
        }

        // if it's all uppper case, do nothing
        if (name.matches("^[A-Z_]*$")) {
            return name;
        }

        name = getNameUsingModelPropertyNaming(name);

        // for reserved word or word starting with number, append _
        if (isReservedWord(name) || name.matches("^\\d.*")) {
            name = escapeReservedWord(name);
        }

        return name;
    }

    @Override
    public String toModelFilename(String name) {
        return new ModelName(name).getFileName();
    }

    @Override
    public String toModelName(String name) {
        return new ModelName(name).getPackageName();
    }

    @Override
    public String toDefaultValue(Schema propertySchema) {
        if (propertySchema instanceof StringSchema) {
            StringSchema sp = (StringSchema) propertySchema;
            if (sp.getDefault() != null) {
                return "\"" + sp.getDefault() + "\"";
            }
            return UNDEFINED_VALUE;
        } else if (propertySchema instanceof BooleanSchema) {
            return UNDEFINED_VALUE;
        } else if (propertySchema instanceof DateSchema) {
            return UNDEFINED_VALUE;
        } else if (propertySchema instanceof DateTimeSchema) {
            return UNDEFINED_VALUE;
        } else if (propertySchema instanceof NumberSchema) {
            NumberSchema dp = (NumberSchema) propertySchema;
            if (dp.getDefault() != null) {
                return dp.getDefault().toString();
            }
            return UNDEFINED_VALUE;
        } else if (propertySchema instanceof IntegerSchema) {
            IntegerSchema ip = (IntegerSchema) propertySchema;
            if (ip.getDefault() != null) {
                return ip.getDefault().toString();
            }
            return UNDEFINED_VALUE;
        } else {
            return UNDEFINED_VALUE;
        }
    }

    @Override
    public CodegenModel fromModel(String name, Schema schema, Map<String, Schema> allDefinitions) {
        final CodegenModel codegenModel = super.fromModel(name, schema, allDefinitions);
        if (isObjectSchema(schema) || schema instanceof MapSchema) {
            codegenModel.getVendorExtensions().put(CodegenConstants.IS_OBJECT_EXT_NAME, Boolean.TRUE);
        }
        return codegenModel;
    }

    @Override
    public CodegenParameter fromParameter(Parameter parameter, Set<String> imports) {
        final CodegenParameter codegenParameter = super.fromParameter(parameter, imports);
        if (parameter.getSchema() != null && isObjectSchema(parameter.getSchema())) {
            codegenParameter.getVendorExtensions().put("x-is-object", Boolean.TRUE);
        }
        return codegenParameter;
    }

    @Override
    public CodegenParameter fromRequestBody(RequestBody body, String name, Schema schema, Map<String, Schema> schemas,
            Set<String> imports) {
        final CodegenParameter codegenParameter = super.fromRequestBody(body, name, schema, schemas, imports);
        if (schema == null) {
            schema = getSchemaFromBody(body);
        }
        if (schema != null && isObjectSchema(schema)) {
            codegenParameter.getVendorExtensions().put("x-is-object", Boolean.TRUE);
        }
        return codegenParameter;
    }

    @Override
    public void postProcessParameter(CodegenParameter parameter) {
        super.postProcessParameter(parameter);

        String type = applyLocalTypeMapping(parameter.dataType);
        parameter.dataType = type;
        parameter.getVendorExtensions().put(CodegenConstants.IS_PRIMITIVE_TYPE_EXT_NAME, isLanguagePrimitive(type));
    }

    @Override
    public Map<String, Object> postProcessModels(Map<String, Object> objs) {
        // process enum in models
        postProcessModelsEnum(objs).get("models");
        return objs;
    }

    @Override
    protected void postProcessAllCodegenModels(Map<String, CodegenModel> allModels) {
        Index index = getIndex();
        for (CodegenModel model : allModels.values()) {
            TypeName type = new TypeName(model.getClassname());
            WebPDFExtension modelExtensions = WebPDFExtension.determineExtension(model, modelPackage());
            modelExtensions.setTypeRootLocation(type.getRootFileLocation());
            String description = escapeDescription(model.getUnescapedDescription());
            if (description != null) {
                modelExtensions.setDescription(description);
            }
            if (!model.getIsEnum()) {
                index.add(new IndexEntry(type.getRootFileLocation(),
                        type.getPackageLocation(modelPackage()), model)
                        .addExportedTypeName(type.getName())
                        .addExportedTypeName(type.getName() + "Interface"));
            } else {
                index.add(new IndexEntry(type.getRootFileLocation(),
                        type.getPackageLocation(modelPackage()), model)
                        .addExportedTypeName(type.getName()));
            }
            IndexEntry entry = index.get(type.getName());
            if (entry == null) {
                throw new IllegalArgumentException("Model not found in index.");
            }

            for (CodegenProperty property : model.getVars()) {
                WebPDFExtension propertyExtensions = WebPDFExtension.determineExtension(property, modelPackage());
                description = escapeDescription(property.getUnescapedDescription());
                if (description != null) {
                    propertyExtensions.setDescription(description);
                }
                if (allModels.containsKey(property.getBaseType())) {
                    CodegenModel refModel = allModels.get(property.getBaseType());
                    WebPDFExtension refModelExtensions = WebPDFExtension.determineExtension(refModel, modelPackage());
                    if (refModel.getIsEnum()) {
                        TypeName refType = new TypeName(refModel.getClassname());
                        propertyExtensions.setIsEnumReference(true);
                        index.add(new IndexEntry(refType.getRootFileLocation(),
                                refType.getPackageLocation(modelPackage()), refModel)
                                .addExportedTypeName(refType.getName()));
                        refModelExtensions.setTypeRootLocation(refType.getRootFileLocation());
                        refModelExtensions.setIsEnumType(true);
                        propertyExtensions.setDefaultValue(refModelExtensions.getDefaultValue());
                    }
                } else if (allModels.containsKey(property.getComplexType())) {
                    CodegenModel refModel = allModels.get(property.getComplexType());
                    WebPDFExtension refModelExtensions = WebPDFExtension.determineExtension(refModel, modelPackage());
                    if (refModel.getIsEnum()) {
                        TypeName refType = new TypeName(refModel.getClassname());
                        propertyExtensions.setIsEnumReference(true);
                        index.add(new IndexEntry(refType.getRootFileLocation(),
                                refType.getPackageLocation(modelPackage()), refModel)
                                .addExportedTypeName(refType.getName()));
                        refModelExtensions.setTypeRootLocation(refType.getRootFileLocation());
                        refModelExtensions.setIsEnumType(true);
                    }
                } else if (property.getIsEnum()) {
                    entry.addExportedTypeName(property.getEnumName());
                }
            }
            Set<String> imports = new HashSet<>();
            if (!model.getIsEnum()) {
                // Always import "Parameter".
                imports.add("Parameter");

                for (CodegenProperty property : model.getVars()) {
                    WebPDFExtension propertyExtensions = WebPDFExtension.determineExtension(property, modelPackage());
                    if (propertyExtensions.isTypeReference() && !property.getIsEnum()) {
                        String propertyTypeName = propertyExtensions.getTypeClassName();
                        String propertyPackage = propertyExtensions.getTypePackageName();
                        TypeName name = new TypeName(propertyPackage + "." + propertyTypeName);
                        imports.add(name.getName());
                    }
                }
                if (modelExtensions.contains(EXTENDS)) {
                    String extendName = modelExtensions.getExtends();
                    String extendPackage = modelExtensions.getExtendsPackage();
                    TypeName name = new TypeName(extendPackage + "." + extendName);
                    imports.add(name.getName());
                    imports.add(name.getName() + "Interface");
                }
                if (modelExtensions.contains(PARENT_CLASS_NAME)) {
                    String extendName = modelExtensions.getParentClassName();
                    String extendPackage = modelExtensions.getParentPackageName();
                    TypeName name = new TypeName(extendPackage + "." + extendName);
                    imports.add(name.getName());
                    imports.add(name.getName() + "Interface");
                }
                if (modelExtensions.contains(EXTENDED_BY)) {
                    for (String extension : modelExtensions.getExtendedBy().values()) {
                        TypeName name = new TypeName(extension);
                        imports.add(name.getName());
                    }
                }
                if (model.getDiscriminator() != null) {
                    Discriminator discriminator = model.getDiscriminator();
                    Map<String, String> mapping = discriminator.getMapping();
                    if (mapping != null) {
                        imports.addAll(discriminator.getMapping().values());
                    }
                }
                modelExtensions.setImports(new ArrayList<>(imports));
            }
        }
        index.sort();
        super.postProcessAllCodegenModels(allModels);
    }

    @Override
    public String apiFileFolder() {
        return outputFolder + File.separator + apiPackage().replace('.', File.separatorChar);
    }

    @Override
    public String modelFileFolder() {
        return outputFolder + File.separator + modelPackage().replace('.', File.separatorChar);
    }

    @Override
    public ISchemaHandler getSchemaHandler() {
        return new TypeScriptSchemaHandler(this);
    }

    @Override
    public CodegenType getTag() {
        return CodegenType.CLIENT;
    }

    @Override
    public String getName() {
        return "typescript-fetch-enhanced";
    }

    @Override
    public String getHelp() {
        return "Generates a TypeScript client library using Fetch API";
    }

    @Override
    public String getDefaultTemplateDir() {
        return "typescript-fetch-enhanced";
    }

    @Override
    public String getSchemaType(Schema schema) {
        String swaggerType = super.getSchemaType(schema);
        if (schema instanceof ComposedSchema) {
            ComposedSchema composedSchema = (ComposedSchema) schema;
            if (composedSchema.getAllOf() != null && !composedSchema.getAllOf().isEmpty()) {

                swaggerType = String.join(" & ",
                        getTypesFromInterfaces(composedSchema.getAllOf()));
            } else if (composedSchema.getOneOf() != null && !composedSchema.getOneOf().isEmpty()) {
                swaggerType = String.join(" | ",
                        getTypesFromInterfaces(composedSchema.getOneOf()));
            } else if (composedSchema.getAnyOf() != null && !composedSchema.getAnyOf().isEmpty()) {
                swaggerType = String.join(" | ",
                        getTypesFromInterfaces(composedSchema.getAnyOf()));
            } else {
                swaggerType = "object";
            }
        } else {
            String type;
            boolean primitive = false;
            if (typeMapping.containsKey(swaggerType)) {
                type = typeMapping.get(swaggerType);
                if (languageSpecificPrimitives.contains(type)) {
                    primitive = true;
                }
            } else {
                type = swaggerType;
            }
            swaggerType = primitive ? type : toModelName(type);
        }

        if (isLanguagePrimitive(swaggerType) || isLanguageGenericType(swaggerType)) {
            return swaggerType;
        }
        applyLocalTypeMapping(swaggerType);
        return swaggerType;
    }

    @Override
    public String getTypeDeclaration(Schema propertySchema) {
        Schema<?> inner;
        if (propertySchema instanceof ArraySchema) {
            ArraySchema arraySchema = (ArraySchema) propertySchema;
            inner = arraySchema.getItems();
            return this.getSchemaType(propertySchema) + "<" + this.getTypeDeclaration(inner) + ">";
        } else if (propertySchema instanceof MapSchema && hasSchemaProperties(propertySchema)) {
            inner = (Schema<?>) propertySchema.getAdditionalProperties();
            return "{ [key: string]: " + this.getTypeDeclaration(inner) + "; }";
        } else if (propertySchema instanceof MapSchema && hasTrueAdditionalProperties(propertySchema)) {
            inner = new ObjectSchema();
            return "{ [key: string]: " + this.getTypeDeclaration(inner) + "; }";
        } else if (propertySchema instanceof FileSchema || propertySchema instanceof BinarySchema) {
            return "Blob";
        } else if (propertySchema instanceof ObjectSchema) {
            return "any";
        } else {
            return getSimpleTypeName(propertySchema);
        }
    }

    public String getSimpleTypeName(Schema<?> propertySchema) {
        String schemaType = getSchemaType(propertySchema);
        if (typeMapping.containsKey(schemaType)) {
            return typeMapping.get(schemaType);
        }
        if (schemaType.contains(".")) {
            return schemaType.substring(schemaType.lastIndexOf(".") + 1);
        }
        return schemaType;
    }

    // TODO: library is using raw types in Schema - which is a bad practice. Fix as soon as the library is cleaned.
    @SuppressWarnings("rawtypes")
    private List<String> getTypesFromInterfaces(List<Schema> interfaces) {
        return interfaces.stream().map(schema -> {
            String schemaType = getSchemaType(schema);
            if (schema instanceof ArraySchema) {
                ArraySchema ap = (ArraySchema) schema;
                Schema<?> inner = ap.getItems();
                schemaType = schemaType + "<" + getSchemaType(inner) + ">";
            }
            return schemaType;
        }).distinct().collect(Collectors.toList());
    }

    public void setModelPropertyNaming(String naming) {
        if ("original".equals(naming) || "camelCase".equals(naming) ||
                "PascalCase".equals(naming) || "snake_case".equals(naming)) {
            this.modelPropertyNaming = naming;
        } else {
            throw new IllegalArgumentException("Invalid model property naming '" +
                    naming + "'. Must be 'original', 'camelCase', " +
                    "'PascalCase' or 'snake_case'");
        }
    }

    public String getModelPropertyNaming() {
        return this.modelPropertyNaming;
    }

    public String getNameUsingModelPropertyNaming(String name) {
        switch (CodegenConstants.MODEL_PROPERTY_NAMING_TYPE.valueOf(getModelPropertyNaming())) {
            case original:
                return name;
            case camelCase:
                return camelize(name, true);
            case PascalCase:
                return camelize(name);
            case snake_case:
                return underscore(name);
            default:
                throw new IllegalArgumentException("Invalid model property naming '" +
                        name + "'. Must be 'original', 'camelCase', " +
                        "'PascalCase' or 'snake_case'");
        }
    }

    public void setSupportsES6(Boolean value) {
        supportsES6 = value;
    }

    public Boolean getSupportsES6() {
        return supportsES6;
    }

    private String applyLocalTypeMapping(String type) {
        if (typeMapping.containsKey(type)) {
            type = typeMapping.get(type);
        }
        return type;
    }

    private boolean isLanguagePrimitive(String type) {
        return languageSpecificPrimitives.contains(type);
    }

    private boolean isLanguageGenericType(String type) {
        for (String genericType : languageGenericTypes) {
            if (type.startsWith(genericType + "<")) {
                return true;
            }
        }
        return false;
    }


    public Index getIndex() {
        Object value = additionalProperties().get(ORDERED_INDEX.getValue());
        if (value instanceof Index) {
            return (Index) value;
        }
        Index index = new Index(modelPackage());
        additionalProperties().put(ORDERED_INDEX.getValue(), index);
        return index;
    }

    private String escapeDescription(String unescapedDescription) {
        return unescapedDescription == null ? null : StringEscapeUtils.escapeJson(unescapedDescription);
    }

}

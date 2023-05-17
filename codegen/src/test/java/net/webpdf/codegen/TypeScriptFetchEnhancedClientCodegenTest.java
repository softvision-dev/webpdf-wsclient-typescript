package test.java.net.webpdf.codegen;


import com.fasterxml.jackson.databind.JsonNode;
import io.swagger.codegen.v3.service.GenerationRequest;
import io.swagger.codegen.v3.service.GeneratorService;
import io.swagger.codegen.v3.service.Options;
import io.swagger.v3.core.util.Json;
import io.swagger.v3.core.util.Yaml;
import org.apache.commons.io.IOUtils;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.io.File;
import java.io.FileInputStream;
import java.io.InputStream;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertFalse;

class TypeScriptFetchEnhancedClientCodegenTest {

    protected static File getOutFolder(boolean delete) {
        try {
            File outputFolder = new File("build/gen");
            if (delete) {
                // delete..
            }
            return outputFolder;
        } catch (Exception e) {
            e.printStackTrace();
            return null;
        }
    }

    @BeforeEach
    void setUp() {
    }

    @AfterEach
    void tearDown() {
    }

    @Test
    public void testGenerator() {

        File openapiFile = new File(".", "openapi.json");

        String path = getOutFolder(false).getAbsolutePath();

        Options options = new Options();
        options.outputDir(path);

        GenerationRequest request = new GenerationRequest();
        request.codegenVersion(GenerationRequest.CodegenVersion.V3) // use V2 to target Swagger/OpenAPI 2.x Codegen version
                .type(GenerationRequest.Type.CLIENT)
                .lang("typescript-fetch-enhanced")
                .spec(loadSpecAsNode(openapiFile,
                        false, // YAML file, use false for JSON
                        false)) // OpenAPI 3.x - use true for Swagger/OpenAPI 2.x definitions
                .options(options);

        List<File> files = new GeneratorService().generationRequest(request).generate();
        assertFalse(files.isEmpty());
        for (File f : files) {
            // test stuff
        }
    }

    protected JsonNode loadSpecAsNode(final File file, boolean yaml, boolean v2) {
        InputStream in = null;
        String s = "";
        try {
            //in = getClass().getClassLoader().getResourceAsStream(file);
            in = new FileInputStream(file);
            if (yaml) {
                if (v2) {
                    return Yaml.mapper().readTree(in);
                } else {
                    return io.swagger.v3.core.util.Yaml.mapper().readTree(in);
                }
            }
            if (v2) {
                return Json.mapper().readTree(in);
            }
            return io.swagger.v3.core.util.Json.mapper().readTree(in);
        } catch (Exception e) {
            throw new RuntimeException("could not load file " + file);
        } finally {
            IOUtils.closeQuietly(in);
        }
    }

}
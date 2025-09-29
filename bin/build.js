import browserslistToEsbuild from 'browserslist-to-esbuild';
import esbuild from 'esbuild';
import fs from 'fs';
import path from 'path';

const DEV_BUILD_PATH = './dist/dev';
const PROD_BUILD_PATH = './dist/prod';
const production = process.env.NODE_ENV === 'production';
const productionTarget = browserslistToEsbuild('defaults');

const BUILD_DIRECTORY = !production ? DEV_BUILD_PATH : PROD_BUILD_PATH;

const files = [
  './src/entry.ts',
  './src/global.ts',
  './src/components/**/*.ts',
  './src/pages/**/*.ts',
];

const buildSettings = {
  entryPoints: files,
  bundle: true,
  outdir: BUILD_DIRECTORY,
  minify: !production ? false : true,
  sourcemap: !production,
  treeShaking: true,
  platform: 'browser',
  target: production ? productionTarget : 'esnext',
};

// Function to recursively delete directory contents
const deleteDirectoryContents = (dirPath) => {
  if (fs.existsSync(dirPath)) {
    fs.readdirSync(dirPath).forEach((file) => {
      const currentPath = path.join(dirPath, file);
      if (fs.lstatSync(currentPath).isDirectory()) {
        // Recurse if the current path is a directory
        deleteDirectoryContents(currentPath);
      } else {
        // Delete file
        fs.unlinkSync(currentPath);
      }
    });
  }
};

try {
  // Clean the build directory before starting the build
  deleteDirectoryContents(BUILD_DIRECTORY);

  if (!production) {
    let ctx = await esbuild.context(buildSettings);

    let { port } = await ctx.serve({
      servedir: BUILD_DIRECTORY,
      port: 3000,
      cors: {
        origin: '*',
      },
    });

    console.log(`Serving at http://localhost:${port}`);
  } else {
    console.log(productionTarget);
    esbuild.build(buildSettings);
  }
} catch (error) {
  console.error(error);
  process.exit(1);
}

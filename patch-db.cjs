const fs = require('fs');

let content = fs.readFileSync('src/db/index.ts', 'utf8');

const replacement = `const selectBuilder = {
  from: (table: any) => {
    const fromResultPromise = (async () => {
      const data = await readLocalJsonDb();
      return (table === schema.employees ? data.employees : data.users) || [];
    })();
    return {
      where: (condition: any) => {
        const resultPromise = (async () => {
          const data = await readLocalJsonDb();
          let list = (table === schema.employees ? data.employees : data.users) || [];
          if (condition) {
            list = list.filter((item: any) => evaluateCondition(item, condition));
          }
          return list;
        })();
        return {
          limit: (n: number) => {
            const limitPromise = (async () => {
              const list = await resultPromise;
              return list.slice(0, n);
            })();
            return {
              then: (onfulfilled: any) => limitPromise.then(onfulfilled)
            };
          },
          then: (onfulfilled: any) => resultPromise.then(onfulfilled)
        };
      },
      limit: (n: number) => {
        const limitPromise = (async () => {
          const list = await fromResultPromise;
          return list.slice(0, n);
        })();
        return {
          then: (onfulfilled: any) => limitPromise.then(onfulfilled)
        };
      },
      then: (onfulfilled: any) => fromResultPromise.then(onfulfilled)
    };
  }
};`;

content = content.replace(
  /const selectBuilder = \{[\s\S]*?then: \(onfulfilled: any\) => \{\s*const resultPromise = \(async \(\) => \{\s*const data = await readLocalJsonDb\(\);\s*return \(table === schema\.employees \? data\.employees : data\.users\) \|\| \[\];\s*\}\)\(\);\s*return resultPromise\.then\(onfulfilled\);\s*\}\s*\}\;\s*\}\s*\};/,
  replacement
);

fs.writeFileSync('src/db/index.ts', content);

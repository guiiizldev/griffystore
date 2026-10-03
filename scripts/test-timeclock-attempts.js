const assert = require("node:assert/strict");
const { mapAttempt, failAttempt } = require("../src/server/timeclock-attempts");
async function unit() {
  const row = { id: "t", user_id: "a", user_name: "Ana", entry_type: "Entrada", entry_at: "2026-10-03T15:00:00Z", status: "processing" };
  const query = async (sql, params) => {
    if (sql.startsWith("UPDATE") && params.id === row.id && params.userId === row.user_id && row.status === "processing") { row.status = "failed"; row.reason = params.reason; }
    return params.userId === row.user_id ? [row] : [];
  };
  assert.equal(mapAttempt(row).at, row.entry_at);
  assert.equal(await failAttempt(query, "t", "other", "Other"), null);
  assert.equal((await failAttempt(query, "t", "a", "GPS")).reason, "GPS");
  row.status = "accepted";
  assert.equal((await failAttempt(query, "t", "a", "Network timeout")).status, "accepted", "Do not mark an already confirmed point as failed");
  console.log("Timeclock attempts: server timestamp, ownership and confirmed-result protection passed.");
}
async function integration() {
  const mysql = require("mysql2/promise");
  const database = `griffy_attempts_test_${Date.now()}`;
  const root = await mysql.createConnection({ host: "127.0.0.1", user: "root", password: "" });
  Object.assign(process.env, { MYSQL_HOST: "127.0.0.1", MYSQL_PORT: "3306", MYSQL_USER: "root", MYSQL_PASSWORD: "", MYSQL_DATABASE: database, STOREFRONT_ADMIN_SECRET: "isolated-test-secret" });
  delete process.env.GRIFFY_CONFIG_DIR;
  const d = require("../src/server/database");
  const { statements } = require("../src/server/schema");
  const { createApp } = require("../src/server/api");
  const { scheduleToday } = require("../src/server/timeclock-scheduling");
  let server;
  try {
    await root.query(`CREATE DATABASE \`${database}\``);
    for (const name of ["users", "app_settings", "time_clock_entries", "time_clock_attempts", "time_clock_schedules", "time_clock_swaps", "time_clock_day_schedules"]) await d.query(statements.find((sql) => sql.startsWith(`CREATE TABLE IF NOT EXISTS ${name} (`)));
    for (const [id,role] of [["admin","admin"],["manager","gerente"],["a","vendedor"],["b","tecnico"]]) await d.query("INSERT INTO users (id,name,role,pin,active) VALUES (:id,:id,:role,'1234',1)", {id,role});
    for (const [key,value] of [["timeclock.store_latitude","-22.8"],["timeclock.store_longitude","-43.3"],["timeclock.allowed_radius_meters","15"]]) await d.query("INSERT INTO app_settings(setting_key,setting_value) VALUES(:key,:value)",{key,value});
    await d.query("INSERT INTO time_clock_schedules(user_id,effective_from,start_time,end_time,work_days,updated_by) VALUES ('a',:date,'00:00','23:59','0,1,2,3,4,5,6','admin')",{date:scheduleToday()});
    server = await new Promise(resolve => {const s=createApp({publicMode:true}).listen(0,"127.0.0.1",()=>resolve(s));});
    const tokens={};
    const request = async (user,path,body,expected) => {
      const r=await fetch(`http://127.0.0.1:${server.address().port}/api/timeclock${path}`,{method:body ? "POST":"GET",headers:{"Content-Type":"application/json",...(tokens[user]?{Authorization:`Bearer ${tokens[user]}`}:{})},...(body?{body:JSON.stringify(body)}:{})});
      const result=await r.json();assert.equal(r.status,expected,JSON.stringify(result));return result;
    };
    for(const user of ["admin","manager","a","b"]) tokens[user]=(await request(user,"/login",{userId:user,pin:"1234"},200)).token;
    const first=await request("a","/attempts",{type:"Entrada"},201);
    await request("b",`/attempts/${first.id}/fail`,{reason:"Not mine"},404);
    const failed=await request("a",`/attempts/${first.id}/fail`,{reason:"Camera denied"},200);
    assert.equal(failed.status,"failed");assert.equal(failed.at,first.at);
    const second=await request("a","/attempts",{type:"Entrada"},201);
    const evidence={type:"Entrada",attemptId:second.id,photoData:"data:image/jpeg;base64,TEST",latitude:-22.8,longitude:-43.3,accuracy:5};
    await request("a","/punch",evidence,200);
    await request("a","/punch",evidence,200);
    assert.equal((await d.query("SELECT COUNT(*) AS total FROM time_clock_entries"))[0].total,1,"Duplicate submission must not create another point");
    assert.equal((await request("a",`/attempts/${second.id}/fail`,{reason:"Network"},200)).status,"accepted");
    const third=await request("a","/attempts",{type:"Entrada"},201);
    await request("a","/punch",{...evidence,attemptId:third.id,latitude:-22.9},400);
    const month=scheduleToday().slice(0,7);
    await request("manager",`/admin/errors?month=${month}`,null,403);
    await request("a",`/admin/errors?month=${month}`,null,403);
    const logs=await request("admin",`/admin/errors?month=${month}`,null,200);
    assert.equal(logs.logs.length,2);assert.ok(logs.logs.every(log=>log.status==="failed"));
    console.log("MySQL/API attempts: late-hour punch accepted, rejection logged, duplicate protection and administrator-only errors passed.");
  } finally {
    if(server) await new Promise(resolve=>server.close(resolve));
    await d.closeDb();await root.query(`DROP DATABASE IF EXISTS \`${database}\``);await root.end();
  }
}
unit().then(()=>process.env.TIMECLOCK_INTEGRATION === "1" ? integration() : null).catch(error=>{console.error(error);process.exitCode=1;});

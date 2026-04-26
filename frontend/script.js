var API='http://localhost:5000/api';
var currentTab='student';

function switchTab(tab){
  currentTab=tab;
  ['student','subject','component','marks'].forEach(function(t){
    document.getElementById('form-'+t).classList.toggle('hidden',t!==tab);
    document.getElementById('tab-'+t).classList.toggle('active',t===tab);
  });
  if(tab==='component') loadAllSubjectsDropdown();
  // Hide data tables when switching tabs
  document.getElementById('data-tables').classList.add('hidden');
  document.getElementById('show-data-btn').textContent='Show Data';
}

function showAlert(msg,type){
  var el=document.getElementById('data-alert');
  el.className='alert alert-'+type;el.textContent=msg;el.classList.remove('hidden');
  setTimeout(function(){el.classList.add('hidden');},3500);
}

function loadAllSubjectsDropdown(){
  var sel=document.getElementById('comp-subid');
  fetch(API+'/subjects').then(function(r){return r.json();}).then(function(data){
    sel.innerHTML='<option value="">-- Select subject --</option>';
    if(Array.isArray(data)) data.forEach(function(s){
      sel.innerHTML+='<option value="'+s.subject_id+'">['+s.subject_id+'] '+s.subject_name+'</option>';
    });
  }).catch(function(){sel.innerHTML='<option value="">Error loading</option>';});
}

function loadSemesterSubjects(){
  var sem=document.getElementById('m-sem').value;
  var sel=document.getElementById('m-subid');
  document.getElementById('marksContainer').innerHTML='';
  if(!sem){sel.innerHTML='<option value="">-- Select semester first --</option>';sel.disabled=true;return;}
  fetch(API+'/subjects?semester='+sem).then(function(r){return r.json();}).then(function(data){
    if(!Array.isArray(data)||data.length===0){sel.innerHTML='<option value="">No subjects for this semester</option>';sel.disabled=true;return;}
    sel.innerHTML='<option value="">-- Select subject --</option>';
    data.forEach(function(s){sel.innerHTML+='<option value="'+s.subject_id+'">['+s.subject_id+'] '+s.subject_name+'</option>';});
    sel.disabled=false;
  }).catch(function(){sel.innerHTML='<option value="">Error loading</option>';sel.disabled=true;});
}

function loadSubjectComponents(){
  var subjectId=document.getElementById('m-subid').value;
  var container=document.getElementById('marksContainer');
  container.innerHTML='';if(!subjectId) return;
  fetch(API+'/components/'+subjectId).then(function(r){return r.json();}).then(function(data){
    if(!Array.isArray(data)||data.length===0){container.innerHTML='<p style="color:#999;font-size:0.85rem;">No components defined.</p>';return;}
    var html='<div class="form-grid" style="margin-bottom:10px;">';
    data.forEach(function(comp){
      var passInfo=comp.passing_marks>0?' (Pass: '+comp.passing_marks+')':'';
      html+='<div class="form-group"><label>'+comp.component_name+' (Max: '+comp.max_marks+passInfo+')</label>';
      html+='<input type="number" min="0" max="'+comp.max_marks+'" data-compid="'+comp.component_id+'" placeholder="0 - '+comp.max_marks+'" required></div>';
    });
    html+='</div>';container.innerHTML=html;
  }).catch(function(){container.innerHTML='<p style="color:red;font-size:0.85rem;">Error loading components</p>';});
}

function submitStudent(e){
  e.preventDefault();
  fetch(API+'/student',{method:'POST',headers:{'Content-Type':'application/json'},
    body:JSON.stringify({roll_no:document.getElementById('s-roll').value,name:document.getElementById('s-name').value,
      seat_no:document.getElementById('s-seat').value,category:document.getElementById('s-cat').value,
      year:document.getElementById('s-year').value,semester:document.getElementById('s-sem').value})
  }).then(function(r){return r.json().then(function(d){return{ok:r.ok,data:d};});})
  .then(function(r){if(!r.ok)throw new Error(r.data.error);showAlert('Student added!','success');e.target.reset();loadStudentsDropdowns();})
  .catch(function(err){showAlert(err.message,'error');});
}

function submitSubject(e){
  e.preventDefault();
  fetch(API+'/subject',{method:'POST',headers:{'Content-Type':'application/json'},
    body:JSON.stringify({subject_id:document.getElementById('sub-id').value,subject_name:document.getElementById('sub-name').value,
      credits:document.getElementById('sub-credits').value,semester:document.getElementById('sub-sem').value})
  }).then(function(r){return r.json().then(function(d){return{ok:r.ok,data:d};});})
  .then(function(r){if(!r.ok)throw new Error(r.data.error);showAlert('Subject added!','success');e.target.reset();})
  .catch(function(err){showAlert(err.message,'error');});
}

function submitComponent(e){
  e.preventDefault();
  fetch(API+'/component',{method:'POST',headers:{'Content-Type':'application/json'},
    body:JSON.stringify({subject_id:document.getElementById('comp-subid').value,component_name:document.getElementById('comp-name').value,
      max_marks:document.getElementById('comp-max').value,passing_marks:document.getElementById('comp-pass').value||0})
  }).then(function(r){return r.json().then(function(d){return{ok:r.ok,data:d};});})
  .then(function(r){if(!r.ok)throw new Error(r.data.error);showAlert('Component added!','success');
    document.getElementById('comp-name').value='';document.getElementById('comp-max').value='';document.getElementById('comp-pass').value='0';})
  .catch(function(err){showAlert(err.message,'error');});
}

function submitMarks(e){
  e.preventDefault();var marksList=[];
  var inputs=document.querySelectorAll('#marksContainer input[type="number"]');
  for(var i=0;i<inputs.length;i++) marksList.push({component_id:inputs[i].getAttribute('data-compid'),obtained_marks:inputs[i].value});
  if(marksList.length===0){showAlert('No components to submit.','error');return;}
  fetch(API+'/marks',{method:'POST',headers:{'Content-Type':'application/json'},
    body:JSON.stringify({roll_no:document.getElementById('m-roll').value,subject_id:document.getElementById('m-subid').value,
      semester:document.getElementById('m-sem').value,credits_earned:document.getElementById('m-credits').value,marks:marksList})
  }).then(function(r){return r.json().then(function(d){return{ok:r.ok,data:d};});})
  .then(function(r){if(!r.ok)throw new Error(r.data.error);showAlert('Marks added!','success');
    for(var i=0;i<inputs.length;i++) inputs[i].value='';})
  .catch(function(err){showAlert(err.message,'error');});
}

// Show data filtered by current tab
function fetchTabData(){
  var btn=document.getElementById('show-data-btn');btn.disabled=true;btn.textContent='Loading...';
  var tab=currentTab;
  var endpoints={student:'/students',subject:'/subjects',component:'/components',marks:'/marks'};
  fetch(API+endpoints[tab]).then(function(r){return r.json();}).then(function(data){
    var arr=Array.isArray(data)?data:[];
    if(tab==='student') renderStudents(arr);
    else if(tab==='subject') renderSubjects(arr);
    else if(tab==='component') renderComponents(arr);
    else if(tab==='marks') renderMarks(arr);
    // Show only the relevant table section
    ['student','subject','component','marks'].forEach(function(t){
      var sec=document.getElementById('table-section-'+t);
      if(sec) sec.classList.toggle('hidden',t!==tab);
    });
    document.getElementById('data-tables').classList.remove('hidden');
    btn.textContent='Refresh Data';loadStudentsDropdowns();
  }).catch(function(){showAlert('Failed to fetch data. Is the backend running?','error');btn.textContent='Show Data';})
  .finally(function(){btn.disabled=false;});
}

function renderStudents(data){
  var tbody=document.getElementById('students-tbody');
  if(data.length===0){tbody.innerHTML='<tr><td colspan="7" class="empty-table">No students yet.</td></tr>';return;}
  var html='';
  data.forEach(function(s){
    html+='<tr><td>'+s.roll_no+'</td><td>'+s.name+'</td><td>'+s.seat_no+'</td><td>'+s.category+'</td><td>'+s.year+'</td><td>'+s.semester+'</td>';
    html+='<td class="action-cell"><button class="btn-action btn-edit" onclick="editStudent('+s.roll_no+',\''+esc(s.name)+'\',\''+esc(s.seat_no)+'\',\''+esc(s.category)+'\','+s.year+','+s.semester+')">Edit</button>';
    html+='<button class="btn-action btn-delete" onclick="deleteStudent('+s.roll_no+')">Delete</button></td></tr>';
  });
  tbody.innerHTML=html;
}

function renderSubjects(data){
  var tbody=document.getElementById('subjects-tbody');
  if(data.length===0){tbody.innerHTML='<tr><td colspan="5" class="empty-table">No subjects yet.</td></tr>';return;}
  var html='';
  data.forEach(function(s){
    html+='<tr><td>'+s.subject_id+'</td><td>'+s.subject_name+'</td><td>'+s.credits+'</td><td>'+s.semester+'</td>';
    html+='<td class="action-cell"><button class="btn-action btn-edit" onclick="editSubject(\''+esc(s.subject_id)+'\',\''+esc(s.subject_name)+'\','+s.credits+','+s.semester+')">Edit</button>';
    html+='<button class="btn-action btn-delete" onclick="deleteSubject(\''+esc(s.subject_id)+'\')">Delete</button></td></tr>';
  });
  tbody.innerHTML=html;
}

function renderComponents(data){
  var tbody=document.getElementById('components-tbody');
  if(data.length===0){tbody.innerHTML='<tr><td colspan="6" class="empty-table">No components yet.</td></tr>';return;}
  var html='';
  data.forEach(function(c){
    html+='<tr><td>'+c.component_id+'</td><td>['+c.subject_id+'] '+(c.subject_name||'')+'</td><td>'+c.component_name+'</td><td>'+c.max_marks+'</td><td>'+(c.passing_marks||0)+'</td>';
    html+='<td class="action-cell"><button class="btn-action btn-edit" onclick="editComponent('+c.component_id+',\''+esc(c.component_name)+'\','+c.max_marks+','+(c.passing_marks||0)+')">Edit</button>';
    html+='<button class="btn-action btn-delete" onclick="deleteComponent('+c.component_id+')">Delete</button></td></tr>';
  });
  tbody.innerHTML=html;
}

function renderMarks(data){
  var tbody=document.getElementById('marks-tbody');
  if(data.length===0){tbody.innerHTML='<tr><td colspan="9" class="empty-table">No marks yet.</td></tr>';return;}
  var html='';
  data.forEach(function(m){
    html+='<tr><td>'+m.roll_no+'</td><td>'+m.student_name+'</td><td>['+m.subject_id+'] '+m.subject_name+'</td><td>'+m.component_name+'</td><td>'+m.semester+'</td><td>'+m.obtained_marks+'</td><td>'+m.max_marks+'</td><td>'+m.credits_earned+'</td>';
    html+='<td class="action-cell"><button class="btn-action btn-edit" onclick="editMark('+m.mark_id+','+m.obtained_marks+','+m.credits_earned+','+m.max_marks+')">Edit</button>';
    html+='<button class="btn-action btn-delete" onclick="deleteMark('+m.mark_id+')">Delete</button></td></tr>';
  });
  tbody.innerHTML=html;
}

function esc(s){return String(s).replace(/'/g,"\\'").replace(/"/g,'&quot;');}

// DELETE functions
function deleteStudent(rollNo){
  if(!confirm('Delete student '+rollNo+'? This will also delete all their marks.')) return;
  fetch(API+'/student/'+rollNo,{method:'DELETE'}).then(function(r){return r.json();})
  .then(function(){showAlert('Student deleted.','success');fetchTabData();loadStudentsDropdowns();})
  .catch(function(err){showAlert('Delete failed: '+err.message,'error');});
}
function deleteSubject(subId){
  if(!confirm('Delete subject '+subId+'? This will also delete its components and marks.')) return;
  fetch(API+'/subject/'+subId,{method:'DELETE'}).then(function(r){return r.json();})
  .then(function(){showAlert('Subject deleted.','success');fetchTabData();})
  .catch(function(err){showAlert('Delete failed: '+err.message,'error');});
}
function deleteComponent(compId){
  if(!confirm('Delete component '+compId+'?')) return;
  fetch(API+'/component/'+compId,{method:'DELETE'}).then(function(r){return r.json();})
  .then(function(){showAlert('Component deleted.','success');fetchTabData();})
  .catch(function(err){showAlert('Delete failed: '+err.message,'error');});
}
function deleteMark(markId){
  if(!confirm('Delete this mark entry?')) return;
  fetch(API+'/mark/'+markId,{method:'DELETE'}).then(function(r){return r.json();})
  .then(function(){showAlert('Mark deleted.','success');fetchTabData();})
  .catch(function(err){showAlert('Delete failed: '+err.message,'error');});
}

// EDIT functions - open modal
var editModalState={};
function openEditModal(title,fields,onSave){
  editModalState.onSave=onSave;
  document.getElementById('edit-modal-title').textContent=title;
  var container=document.getElementById('edit-modal-fields');
  var html='';
  fields.forEach(function(f){
    html+='<div class="form-group"><label>'+f.label+'</label>';
    if(f.type==='select'){
      html+='<select id="edit-'+f.name+'">';
      f.options.forEach(function(o){html+='<option value="'+o.value+'"'+(o.value==f.value?' selected':'')+'>'+o.text+'</option>';});
      html+='</select>';
    } else {
      html+='<input id="edit-'+f.name+'" type="'+(f.type||'text')+'" value="'+f.value+'"'+(f.max?' max="'+f.max+'"':'')+' required>';
    }
    html+='</div>';
  });
  container.innerHTML=html;
  document.getElementById('edit-modal').classList.remove('hidden');
}
function closeEditModal(){document.getElementById('edit-modal').classList.add('hidden');}
function submitEditModal(e){e.preventDefault();if(editModalState.onSave) editModalState.onSave();}

function editStudent(rollNo,name,seatNo,category,year,semester){
  openEditModal('Edit Student',[
    {name:'name',label:'Name',value:name},
    {name:'seat_no',label:'Seat No',value:seatNo},
    {name:'category',label:'Category',type:'select',value:category,options:[
      {value:'General',text:'General'},{value:'OBC',text:'OBC'},{value:'SC',text:'SC'},{value:'ST',text:'ST'},{value:'EWS',text:'EWS'}]},
    {name:'year',label:'Year',type:'number',value:year},
    {name:'semester',label:'Semester',type:'number',value:semester}
  ],function(){
    fetch(API+'/student/'+rollNo,{method:'PUT',headers:{'Content-Type':'application/json'},
      body:JSON.stringify({name:document.getElementById('edit-name').value,seat_no:document.getElementById('edit-seat_no').value,
        category:document.getElementById('edit-category').value,year:document.getElementById('edit-year').value,
        semester:document.getElementById('edit-semester').value})
    }).then(function(r){return r.json();}).then(function(){showAlert('Student updated.','success');closeEditModal();fetchTabData();loadStudentsDropdowns();})
    .catch(function(err){showAlert('Update failed: '+err.message,'error');});
  });
}

function editSubject(subId,subName,credits,semester){
  openEditModal('Edit Subject',[
    {name:'subject_name',label:'Subject Name',value:subName},
    {name:'credits',label:'Credits',type:'number',value:credits},
    {name:'semester',label:'Semester',type:'number',value:semester}
  ],function(){
    fetch(API+'/subject/'+subId,{method:'PUT',headers:{'Content-Type':'application/json'},
      body:JSON.stringify({subject_name:document.getElementById('edit-subject_name').value,
        credits:document.getElementById('edit-credits').value,semester:document.getElementById('edit-semester').value})
    }).then(function(r){return r.json();}).then(function(){showAlert('Subject updated.','success');closeEditModal();fetchTabData();})
    .catch(function(err){showAlert('Update failed: '+err.message,'error');});
  });
}

function editComponent(compId,compName,maxMarks,passMarks){
  openEditModal('Edit Component',[
    {name:'component_name',label:'Component Name',value:compName},
    {name:'max_marks',label:'Max Marks',type:'number',value:maxMarks},
    {name:'passing_marks',label:'Passing Marks',type:'number',value:passMarks}
  ],function(){
    fetch(API+'/component/'+compId,{method:'PUT',headers:{'Content-Type':'application/json'},
      body:JSON.stringify({component_name:document.getElementById('edit-component_name').value,
        max_marks:document.getElementById('edit-max_marks').value,passing_marks:document.getElementById('edit-passing_marks').value})
    }).then(function(r){return r.json();}).then(function(){showAlert('Component updated.','success');closeEditModal();fetchTabData();})
    .catch(function(err){showAlert('Update failed: '+err.message,'error');});
  });
}

function editMark(markId,obtained,credits,maxMarks){
  openEditModal('Edit Mark',[
    {name:'obtained_marks',label:'Obtained Marks',type:'number',value:obtained,max:maxMarks},
    {name:'credits_earned',label:'Credits Earned',type:'number',value:credits}
  ],function(){
    fetch(API+'/mark/'+markId,{method:'PUT',headers:{'Content-Type':'application/json'},
      body:JSON.stringify({obtained_marks:document.getElementById('edit-obtained_marks').value,
        credits_earned:document.getElementById('edit-credits_earned').value})
    }).then(function(r){return r.json();}).then(function(){showAlert('Mark updated.','success');closeEditModal();fetchTabData();})
    .catch(function(err){showAlert('Update failed: '+err.message,'error');});
  });
}

// Load Students Dropdowns
function loadStudentsDropdowns(){
  fetch(API+'/students').then(function(r){return r.json();}).then(function(data){
    ['sq-student','pq-student'].forEach(function(id){
      var sel=document.getElementById(id);var prev=sel.value;
      sel.innerHTML='<option value="">-- Choose a student --</option>';
      if(Array.isArray(data)) data.forEach(function(st){
        sel.innerHTML+='<option value="'+st.roll_no+'">['+st.roll_no+'] '+st.name+'</option>';
      });
      if(prev) sel.value=prev;
    });
  }).catch(function(){});
}

// Query Definitions - base queries always shown
var QUERIES_BASE=[
  {type:'sgpa',label:'SGPA',icon:'GPA',unit:'/ 10'},
  {type:'total_credits',label:'Total Credits',icon:'CR',unit:'credits'},
  {type:'backlogs',label:'Backlogs',icon:'BK',unit:'subject(s)'},
  {type:'grace_marks',label:'Grace Marks',icon:'GR',unit:'marks'},
  {type:'result_status',label:'Result Status',icon:'RS',unit:null},
];
// Even-semester-only queries
var QUERIES_EVEN=[
  {type:'cgpa',label:'CGPA',icon:'CG',unit:'/ 10'},
  {type:'next_year_eligibility',label:'Next Year Eligibility',icon:'NY',unit:null},
];

function getSelectedSemester(method){
  var semSel=method==='sql'?'sq-sem':'pq-sem';
  return parseInt(document.getElementById(semSel).value)||0;
}

function buildQueryButtons(){
  ['sql','prolog'].forEach(function(method){
    var grid=document.getElementById(method+'-query-grid');
    var sem=getSelectedSemester(method);
    var queries=QUERIES_BASE.slice();
    if(sem>0&&sem%2===0) queries=queries.concat(QUERIES_EVEN);
    var html='';
    queries.forEach(function(q){
      html+='<button class="query-btn" id="'+method+'-qbtn-'+q.type+'" onclick="runQuery(\''+method+'\',\''+q.type+'\')" disabled>';
      html+='<span class="q-icon">'+q.icon+'</span><span>'+q.label+'</span></button>';
    });
    grid.innerHTML=html;
  });
}

// Enable/disable query buttons + rebuild on semester change
document.addEventListener('change',function(e){
  if(e.target.id==='sq-student'||e.target.id==='sq-sem'){
    if(e.target.id==='sq-sem') buildQueryButtons();
    var sem=getSelectedSemester('sql');
    var queries=QUERIES_BASE.slice();
    if(sem>0&&sem%2===0) queries=queries.concat(QUERIES_EVEN);
    var hasSql=document.getElementById('sq-student').value&&document.getElementById('sq-sem').value;
    queries.forEach(function(q){
      var btn=document.getElementById('sql-qbtn-'+q.type);
      if(btn) btn.disabled=!hasSql;
    });
    document.getElementById('sql-query-empty').classList.toggle('hidden',hasSql);
    if(!hasSql) document.getElementById('sql-result-panel').classList.add('hidden');
  }
  if(e.target.id==='pq-student'||e.target.id==='pq-sem'){
    if(e.target.id==='pq-sem') buildQueryButtons();
    var sem2=getSelectedSemester('prolog');
    var queries2=QUERIES_BASE.slice();
    if(sem2>0&&sem2%2===0) queries2=queries2.concat(QUERIES_EVEN);
    var hasProlog=document.getElementById('pq-student').value&&document.getElementById('pq-sem').value;
    queries2.forEach(function(q){
      var btn=document.getElementById('prolog-qbtn-'+q.type);
      if(btn) btn.disabled=!hasProlog;
    });
    document.getElementById('prolog-query-empty').classList.toggle('hidden',hasProlog);
    if(!hasProlog) document.getElementById('prolog-result-panel').classList.add('hidden');
  }
});

function getAllQueries(){return QUERIES_BASE.concat(QUERIES_EVEN);}

function runQuery(method,queryType){
  var studentSel=method==='sql'?'sq-student':'pq-student';
  var semSel=method==='sql'?'sq-sem':'pq-sem';
  var roll=document.getElementById(studentSel).value;
  var sem=document.getElementById(semSel).value;
  if(!roll||!sem) return;
  var btn=document.getElementById(method+'-qbtn-'+queryType);
  btn.disabled=true;
  var endpoint=method==='sql'?'/query/sql':'/query/prolog';
  fetch(API+endpoint,{method:'POST',headers:{'Content-Type':'application/json'},
    body:JSON.stringify({query_type:queryType,roll_no:parseInt(roll),semester:parseInt(sem)})
  }).then(function(r){return r.json();}).then(function(data){
    if(data.error) throw new Error(data.error);
    var result=data.result;
    var q=null;
    getAllQueries().forEach(function(qq){if(qq.type===queryType) q=qq;});
    document.getElementById(method+'-result-label').textContent=q.label;
    if(result.error){
      document.getElementById(method+'-result-value').innerHTML='<span style="color:red;">'+result.error+'</span>';
    } else if(queryType==='result_status'||queryType==='next_year_eligibility'){
      document.getElementById(method+'-result-value').innerHTML=statusBadge(result.value);
    } else {
      var val=queryType==='sgpa'||queryType==='cgpa'?parseFloat(result.value).toFixed(2):result.value;
      document.getElementById(method+'-result-value').textContent=val+(q.unit?' '+q.unit:'');
    }
    document.getElementById(method+'-result-time').textContent='Execution Time: '+result.execution_time_ms+' ms';
    document.getElementById(method+'-result-panel').classList.remove('hidden');
    document.getElementById(method+'-query-empty').classList.add('hidden');
  }).catch(function(err){showAlert('Query failed: '+err.message,'error');})
  .finally(function(){btn.disabled=false;});
}

function statusBadge(val){
  var v=(val||'').toUpperCase();
  var cls='badge-pass';
  if(v.indexOf('FAIL')>=0) cls='badge-fail';
  else if(v.indexOf('ATKT')>=0) cls='badge-atkt';
  else if(v.indexOf('GRACE')>=0) cls='badge-grace';
  else if(v.indexOf('NOT ELIGIBLE')>=0) cls='badge-fail';
  else if(v.indexOf('ELIGIBLE')>=0) cls='badge-pass';
  return '<span class="badge '+cls+'">'+val+'</span>';
}

window.onload=function(){loadStudentsDropdowns();buildQueryButtons();};

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.log("Missing Supabase credentials in .env.local");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function seed() {
    console.log('--- Starting Seed Process ---');

    // 1. Create demo user
    console.log('Creating demo user...');
    const { data: userData, error: userError } = await supabase.auth.admin.createUser({
        email: 'admin@arq-medios.com',
        password: 'Demo1234!',
        email_confirm: true
    });

    let userId;
    if (userError) {
        if (userError.message.includes('already been registered')) {
            console.log('User already exists, retrieving...');
            const { data: existingUser, error: reqErr } = await supabase.auth.admin.listUsers();
            const user = existingUser.users.find(u => u.email === 'admin@arq-medios.com');
            userId = user.id;
        } else {
            console.error('Error creating user', userError);
            return;
        }
    } else {
        userId = userData.user.id;
    }

    console.log('User ID:', userId);

    // 2. Update Profile Name
    const { error: profileError } = await supabase.from('profiles').update({
        full_name: 'Admin Principal'
    }).eq('id', userId);

    if (profileError) console.error('Error updating profile:', profileError);

    // Helper arrays
    const statuses = ['planning', 'active', 'completed', 'on_hold'];
    const taskStatuses = ['todo', 'in_progress', 'review', 'done'];
    const priorities = ['low', 'medium', 'high'];

    // 3. Insert Projects
    console.log('Inserting 10 projects...');
    const projects = Array.from({ length: 10 }).map((_, i) => ({
        user_id: userId,
        name: `Proyecto ${i + 1}`,
        description: `Descripción del proyecto ${i + 1}`,
        status: statuses[i % statuses.length],
    }));

    const { data: insertedProjects, error: projErr } = await supabase
        .from('projects')
        .insert(projects)
        .select();

    if (projErr) console.error('Error projects:', projErr);

    // 4. Insert 15 Tasks
    console.log('Inserting 15 tasks...');
    const tasks = [];
    const now = new Date();
    for (let i = 0; i < 15; i++) {
        let date = new Date(now);
        let status = taskStatuses[i % taskStatuses.length];
        if (i < 5) { // past
            date.setDate(date.getDate() - (i + 1));
            status = 'done';
        } else if (i < 10) { // today
            // already today
        } else { // future
            date.setDate(date.getDate() + (i - 9));
            status = 'todo';
        }

        tasks.push({
            user_id: userId,
            title: `Tarea ${i + 1}`,
            description: `Descripción de la tarea ${i + 1}`,
            status: status,
            priority: priorities[i % priorities.length],
            created_at: date.toISOString()
        });
    }
    const { error: taskErr } = await supabase.from('tasks').insert(tasks);
    if (taskErr) console.error('Error tasks:', taskErr);

    // 5. Insert 5 Team Members
    console.log('Inserting 5 team members...');
    const members = Array.from({ length: 5 }).map((_, i) => ({
        user_id: userId,
        first_name: `Miembro`,
        last_name: `Equipo ${i + 1}`,
        email: `miembro${i + 1}@arq-medios.com`,
    }));
    const { error: memberErr } = await supabase.from('team_members').insert(members);
    if (memberErr) console.error('Error team_members:', memberErr);

    // 6. Insert 5 Sprints
    console.log('Inserting 5 sprints...');
    const sprints = Array.from({ length: 5 }).map((_, i) => ({
        user_id: userId,
        name: `Sprint ${i + 1}`,
        description: `Objetivos del sprint ${i + 1}`,
        status: statuses[i % statuses.length]
    }));
    const { error: sprintErr } = await supabase.from('sprints').insert(sprints);
    if (sprintErr) console.error('Error sprints:', sprintErr);

    // 7. Insert 5 Clients
    console.log('Inserting 5 clients...');
    const clients = Array.from({ length: 5 }).map((_, i) => ({
        user_id: userId,
        first_name: `Cliente`,
        last_name: `Externo ${i + 1}`,
        email: `cliente${i + 1}@empresa.com`,
    }));
    const { error: clientErr } = await supabase.from('clients').insert(clients);
    if (clientErr) console.error('Error clients:', clientErr);

    console.log('--- Seed Process Complete ---');
}

seed().catch(console.error);



* about deployment flow seup project 

    * about this project plan is one jenkins and many server
    * the first is : 
        run terraform for setup servers 
            - server jenkins (has already)
            - server for cliens 
        
        jenkins server need : 
            - set up jenkins on this server
            - generate ssh key if not have yet (public and private ssh key )
            - 
            

ANSIBLE : 
    for encrypt 
    ansible-vault encrypt ansible/inventories/production/group_vars/vault.yml


jan / 31 / 2026
    
    - run for create server clien
    - configre for jenkins server and clien server can ssh
    - set point DNS and SSL (HTTPS) not yet (i will add after conatiner is UP)
    - 

feb / 2 / 2026

    - prepare jenkins dashbaord credenatail 

    ***(when whe use scm in job pipeline not work make sure you have 
        - set ssh private key on jenkins dashbaord 
        - set ssh public key on github SSH and GPG key 
    )

    - create job pepiline
    - setup webhook 

    


    
